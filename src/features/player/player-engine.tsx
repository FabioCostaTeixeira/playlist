"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Expand, LoaderCircle, MonitorUp, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SlideStage } from "@/features/player/slide-stage";
import {
  explainBootstrapFailure,
  isReachable,
  PlayerSyncError,
  syncFailureMessage,
} from "@/features/player/sync-status";

type Item = {
  id: string;
  type: "url" | "image" | "video" | "html";
  src?: string;
  html?: string;
  durationSeconds: number;
  transition: string;
};
type Manifest = {
  schemaVersion: 1;
  playlistId: string;
  version: number;
  items: Item[];
};
type Bootstrap = {
  deviceId: string;
  pointerUrl?: string;
  manifest?: Manifest;
  heartbeatSeconds: number;
};

const DB_NAME = "playlist-player";
const STORE = "state";

async function storeValue(key: string, value?: unknown): Promise<unknown> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE,
      value === undefined ? "readonly" : "readwrite",
    );
    const request =
      value === undefined
        ? transaction.objectStore(STORE).get(key)
        : transaction.objectStore(STORE).put(value, key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

async function cacheMedia(manifest: Manifest) {
  if (!("caches" in window)) return;
  const cache = await caches.open(`playlist-v${manifest.version}`);
  await Promise.allSettled(
    manifest.items
      .filter((item) => item.src && ["image", "video"].includes(item.type))
      .slice(0, 25)
      .map((item) => cache.add(item.src!)),
  );
}

export function PlayerEngine() {
  const [token, setToken] = useState<string>();
  const [manifest, setManifest] = useState<Manifest>();
  const [online, setOnline] = useState(true);
  const [message, setMessage] = useState("Preparando player…");
  const [activating, setActivating] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const pointerRef = useRef("");
  const etagRef = useRef("");
  const failuresRef = useRef(0);

  const authFetch = useCallback(
    (url: string, init?: RequestInit) =>
      fetch(url, {
        ...init,
        headers: { ...init?.headers, authorization: `Bearer ${token}` },
      }),
    [token],
  );

  const sync = useCallback(async () => {
    if (!token) return;
    try {
      const bootstrapResponse = await authFetch("/api/player/bootstrap");
      if (!bootstrapResponse.ok)
        throw explainBootstrapFailure(
          bootstrapResponse.status,
          await bootstrapResponse.text().catch(() => ""),
        );
      const data = (await bootstrapResponse.json()) as Bootstrap;
      let next = data.manifest;
      if (data.manifest) {
        pointerRef.current = "";
        etagRef.current = "";
      }
      if (!next) {
        if (!data.pointerUrl)
          throw new PlayerSyncError(
            "A programação desta tela ainda não foi publicada na central.",
          );
        if (pointerRef.current !== data.pointerUrl) {
          pointerRef.current = data.pointerUrl;
          etagRef.current = "";
        }
        const pointerResponse = await fetch(pointerRef.current, {
          cache: "no-store",
          headers: etagRef.current ? { "if-none-match": etagRef.current } : {},
        });
        if (pointerResponse.status === 304) {
          failuresRef.current = 0;
          return;
        }
        if (!pointerResponse.ok) throw new Error("pointer_unavailable");
        etagRef.current = pointerResponse.headers.get("etag") ?? "";
        const document = (await pointerResponse.json()) as
          Manifest | { manifestUrl: string; version: number };
        if ("schemaVersion" in document) {
          next = document;
        } else {
          const nextResponse = await fetch(document.manifestUrl, {
            cache: "force-cache",
          });
          if (!nextResponse.ok) throw new Error("manifest_unavailable");
          next = (await nextResponse.json()) as Manifest;
        }
      }
      if (!next.items?.length || next.schemaVersion !== 1)
        throw new Error("manifest_invalid");
      if (
        next.playlistId === manifest?.playlistId &&
        next.version === manifest.version
      ) {
        failuresRef.current = 0;
        setOnline(true);
        return;
      }
      setManifest(next);
      setMessage("");
      setOnline(true);
      failuresRef.current = 0;
      await storeValue("manifest", next);
      await cacheMedia(next);
    } catch (error) {
      failuresRef.current += 1;
      // A central recusando com um motivo não significa rede fora do ar.
      setOnline(isReachable(error));
      setMessage(syncFailureMessage(error, Boolean(manifest?.items?.length)));
    }
  }, [authFetch, manifest, token]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if ("serviceWorker" in navigator)
        await navigator.serviceWorker.register("/sw.js");
      const savedToken = (await storeValue("token")) as string | undefined;
      const savedManifest = (await storeValue("manifest")) as
        Manifest | undefined;
      if (cancelled) return;
      if (savedManifest?.items?.length) {
        setManifest(savedManifest);
        setMessage("Usando programação salva…");
      }
      if (savedToken) setToken(savedToken);
      else setMessage("Ative esta tela para começar.");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    let stopped = false;
    const timer = window.setTimeout(
      () =>
        void sync().catch(() => {
          if (!stopped) {
            setOnline(false);
            setMessage(
              manifest
                ? "API indisponível. Reproduzindo cache."
                : "Não foi possível carregar programação.",
            );
          }
        }),
      0,
    );
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [manifest, sync, token]);

  useEffect(() => {
    if (!token) return;
    const interval = window.setInterval(
      () => void sync(),
      Math.min(300_000, 60_000 * 2 ** Math.min(failuresRef.current, 3)) +
        Math.random() * 5_000,
    );
    return () => window.clearInterval(interval);
  }, [sync, token]);

  useEffect(() => {
    if (!token) return;
    const heartbeat = () =>
      void authFetch("/api/player/heartbeat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resolutionWidth: window.screen.width,
          resolutionHeight: window.screen.height,
          playerVersion: "1.0.0",
        }),
      });
    heartbeat();
    const interval = window.setInterval(heartbeat, 300_000);
    return () => window.clearInterval(interval);
  }, [authFetch, token]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  async function activate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActivating(true);
    const code = String(new FormData(event.currentTarget).get("code"));
    const response = await fetch("/api/player/activate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setActivating(false);
    if (!response.ok)
      return setMessage("Código inválido, expirado ou já utilizado.");
    const result = (await response.json()) as { token: string };
    await storeValue("token", result.token);
    setToken(result.token);
    setMessage("Ativação concluída. Sincronizando…");
  }

  if (!token)
    return (
      <main className="grid min-h-screen place-items-center bg-black p-6 text-white">
        <div className="w-full max-w-md text-center">
          <span className="mx-auto mb-7 grid size-16 place-items-center rounded-2xl bg-emerald-400 text-black">
            <MonitorUp className="size-8" />
          </span>
          <h1 className="text-3xl font-semibold">Ativar tela</h1>
          <p className="mt-2 text-zinc-400">
            Digite código temporário gerado na central administrativa.
          </p>
          <form
            onSubmit={activate}
            className="mx-auto mt-8 flex max-w-xs gap-2"
          >
            <Input
              name="code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              aria-label="Código de ativação"
              placeholder="000000"
              className="h-12 bg-zinc-950 text-center font-mono text-xl tracking-[.3em]"
              required
            />
            <Button className="h-12" disabled={activating}>
              {activating ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                "Ativar"
              )}
            </Button>
          </form>
          <p role="status" className="mt-4 min-h-5 text-sm text-amber-300">
            {message}
          </p>
        </div>
      </main>
    );

  const hasItems = Boolean(manifest?.items?.length);
  return (
    <main className="relative h-screen overflow-hidden bg-black text-white">
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2 opacity-20 transition hover:opacity-100">
        {!online && (
          <span className="flex items-center gap-1 rounded-full bg-black/70 px-3 py-1 text-xs">
            <WifiOff className="size-3" /> Offline
          </span>
        )}
        <Button
          variant="secondary"
          size="icon"
          onClick={() => void document.documentElement.requestFullscreen()}
        >
          <Expand />
          <span className="sr-only">Tela cheia</span>
        </Button>
      </div>
      {!hasItems ? (
        <div className="grid h-full place-items-center">
          <div className="text-center">
            <LoaderCircle className="mx-auto mb-3 animate-spin" />
            <p className="text-sm text-zinc-400">{message}</p>
          </div>
        </div>
      ) : (
        <SlideStage
          key={manifest!.version}
          items={manifest!.items}
          reduceMotion={reduceMotion}
        />
      )}
      {message && manifest && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-xs text-zinc-300">
          {message}
        </p>
      )}
    </main>
  );
}
