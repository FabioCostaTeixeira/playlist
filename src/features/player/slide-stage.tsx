"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  canRotate,
  dwellMs,
  FLIP_DURATION_MS,
  nextIndex,
  READY_CAP_MS,
  resolveTransition,
} from "@/features/player/rotation";

export type StageItem = {
  id: string;
  type: "url" | "image" | "video" | "html";
  src?: string;
  html?: string;
  durationSeconds: number;
  transition: string;
};

type Slot = 0 | 1;
const other = (slot: Slot): Slot => (slot === 0 ? 1 : 0);

/**
 * Palco de exibição com double-buffer: dois slots de conteúdo, um visível e outro
 * carregando o próximo item escondido. A troca só acontece quando o próximo já
 * carregou (ou estourou o teto de espera), então o espectador nunca vê um portal
 * abrindo. A virada em si é uma animação 3D (cubo/flip) — ver globals.css.
 */
export function SlideStage({
  items,
  reduceMotion = false,
}: {
  items: StageItem[];
  reduceMotion?: boolean;
}) {
  // O reinício ao publicar nova versão é feito pelo `key` no componente pai, que
  // remonta este palco com estado fresco — por isso não há efeito de reset aqui.
  const length = items.length;
  const rotating = canRotate(length);

  const [front, setFront] = useState<Slot>(0);
  const [slotItems, setSlotItems] = useState<[number, number]>([
    0,
    rotating ? 1 : 0,
  ]);

  const readyRef = useRef<[boolean, boolean]>([false, false]);
  const armedRef = useRef(false);
  const flippedRef = useRef(false);
  const dwellTimer = useRef<number>(undefined);
  const capTimer = useRef<number>(undefined);

  const clearTimers = useCallback(() => {
    window.clearTimeout(dwellTimer.current);
    window.clearTimeout(capTimer.current);
  }, []);

  const doFlip = useCallback(
    (back: Slot) => {
      if (flippedRef.current) return; // uma virada por ciclo (protege de vídeo+dwell juntos)
      flippedRef.current = true;
      armedRef.current = false;
      clearTimers();
      // Já entrega ao slot que sai da frente o PRÓXIMO item, que passa a
      // pré-carregar (fresco) escondido enquanto a virada acontece.
      const newActive = slotItems[back];
      const leaving = other(back); // o que estava na frente
      const upcoming = nextIndex(newActive, length);
      readyRef.current[leaving] = false;
      setFront(back);
      setSlotItems((prev) => {
        const copy: [number, number] = [prev[0], prev[1]];
        copy[leaving] = upcoming;
        return copy;
      });
    },
    [slotItems, length, clearTimers],
  );

  const tryFlip = useCallback(
    (back: Slot) => {
      if (!armedRef.current || flippedRef.current) return;
      if (readyRef.current[back]) {
        doFlip(back);
        return;
      }
      // Próximo ainda carregando: espera até ficar pronto ou estourar o teto.
      window.clearTimeout(capTimer.current);
      capTimer.current = window.setTimeout(() => doFlip(back), READY_CAP_MS);
    },
    [doFlip],
  );

  const handleReady = useCallback(
    (slot: Slot) => {
      readyRef.current[slot] = true;
      const back = other(front);
      if (armedRef.current && slot === back) tryFlip(back);
    },
    [front, tryFlip],
  );

  // Avanço antecipado quando um vídeo termina antes do tempo de exibição.
  const advanceNow = useCallback(() => {
    const back = other(front);
    armedRef.current = true;
    tryFlip(back);
  }, [front, tryFlip]);

  // Motor do rodízio: a cada item que assume a frente, agenda o tempo de exibição.
  // O pré-carregamento do próximo já foi disparado por `doFlip` (ou pelo estado
  // inicial), então aqui não há setState — só o timer do dwell.
  useEffect(() => {
    if (!rotating) return;
    const back = other(front);
    flippedRef.current = false;
    armedRef.current = false;
    const active = items[slotItems[front]];
    dwellTimer.current = window.setTimeout(() => {
      armedRef.current = true;
      tryFlip(back);
    }, dwellMs(active?.durationSeconds));

    return () => window.clearTimeout(dwellTimer.current);
  }, [front, slotItems, rotating, items, tryFlip]);

  useEffect(() => clearTimers, [clearTimers]);

  const kind = resolveTransition(items[slotItems[front]]?.transition, {
    reduceMotion,
  });

  const renderSlot = (slot: Slot) => {
    const item = items[slotItems[slot]];
    if (!item) return null;
    const active = front === slot;
    return (
      <div
        className="player-face"
        data-slot={slot}
        data-active={active}
        aria-hidden={!active}
      >
        <SlotContent
          item={item}
          active={active}
          onReady={() => handleReady(slot)}
          onVideoEnded={advanceNow}
        />
      </div>
    );
  };

  return (
    <div
      className="player-stage"
      data-transition={kind}
      data-front={front}
      style={{ ["--flip-ms" as string]: `${FLIP_DURATION_MS}ms` }}
    >
      <div className="player-stage-inner">
        {renderSlot(0)}
        {rotating && renderSlot(1)}
      </div>
    </div>
  );
}

/** Renderiza um item e avisa `onReady` quando o conteúdo terminou de carregar. */
function SlotContent({
  item,
  active,
  onReady,
  onVideoEnded,
}: {
  item: StageItem;
  active: boolean;
  onReady: () => void;
  onVideoEnded: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Vídeo só começa a tocar quando o slot está na frente (evita "adiantar" oculto).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      video.currentTime = 0;
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [active, item.id]);

  if (item.type === "image" && item.src) {
    return (
      <Image
        key={item.src}
        src={item.src}
        alt=""
        fill
        unoptimized
        sizes="100vw"
        className="object-contain"
        onLoad={onReady}
        onError={onReady}
      />
    );
  }
  if (item.type === "video") {
    return (
      <video
        key={item.src}
        ref={videoRef}
        src={item.src}
        className="h-full w-full object-contain"
        muted
        playsInline
        preload="auto"
        onCanPlay={onReady}
        onError={onReady}
        onEnded={() => active && onVideoEnded()}
      />
    );
  }
  if (item.type === "url") {
    return (
      <iframe
        key={item.src}
        src={item.src}
        title="Conteúdo externo"
        className="h-full w-full border-0"
        sandbox="allow-scripts allow-forms allow-popups"
        referrerPolicy="no-referrer"
        onLoad={onReady}
      />
    );
  }
  return (
    <iframe
      key={item.id}
      srcDoc={item.html}
      title="Conteúdo HTML"
      className="h-full w-full border-0"
      sandbox=""
      referrerPolicy="no-referrer"
      onLoad={onReady}
    />
  );
}
