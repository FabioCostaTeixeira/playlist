"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  CircleAlert,
  Pause,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import {
  persistEmergency,
  persistSchedule,
  persistScheduleStatus,
  responseErrorMessage,
  type ScheduleStatus,
} from "@/components/app/schedule-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Resource = { id: string; name: string; status?: string };
type Schedule = {
  id: string;
  targetType: "channel" | "device";
  targetId: string;
  playlistId: string;
  startsAt: string;
  endsAt: string | null;
  priority: number;
  timezone: string;
  status: ScheduleStatus;
};
type Emergency = {
  id: string;
  targetType: "channel" | "device";
  targetId: string | null;
  contentId: string | null;
  playlistId: string | null;
  endsAt: string;
};
type Data = {
  schedules: Schedule[];
  playlists: Resource[];
  channels: Resource[];
  devices: Resource[];
  contents: Resource[];
  emergencies: Emergency[];
};

const fmt = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

export function ScheduleWorkspace() {
  const [data, setData] = useState<Data>({
    schedules: [],
    playlists: [],
    channels: [],
    devices: [],
    contents: [],
    emergencies: [],
  });
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [targetType, setTargetType] = useState<"channel" | "device">("channel");
  const [emergencyKind, setEmergencyKind] = useState<"content" | "playlist">(
    "content",
  );
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const names = [
        "schedules",
        "playlists",
        "channels",
        "devices",
        "contents",
      ] as const;
      const results = await Promise.all([
        ...names.map(async (name) => {
          const response = await fetch(
            `/api/admin/resources/${name}?limit=100`,
            { cache: "no-store" },
          );
          if (!response.ok)
            throw new Error(await responseErrorMessage(response));
          return [
            name,
            ((await response.json()) as { data: unknown[] }).data,
          ] as const;
        }),
        (async () => {
          const response = await fetch("/api/admin/emergency", {
            cache: "no-store",
          });
          if (!response.ok)
            throw new Error(await responseErrorMessage(response));
          return ["emergencies", await response.json()] as const;
        })(),
      ]);
      setData(Object.fromEntries(results) as Data);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Falha ao carregar programação",
      );
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const targets = targetType === "channel" ? data.channels : data.devices;

  async function createSchedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      const ends = String(form.get("endsAt") ?? "");
      const payload = {
        targetType,
        targetId: String(form.get("targetId")),
        playlistId: String(form.get("playlistId")),
        startsAt: new Date(String(form.get("startsAt"))).toISOString(),
        endsAt: ends ? new Date(ends).toISOString() : null,
        priority: Number(form.get("priority")),
        timezone: "America/Sao_Paulo",
        status: "active" as const,
      };
      await persistSchedule(payload);
      setScheduleOpen(false);
      await load();
      toast.success("Agendamento criado");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao criar agendamento",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createEmergency(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      const payload = {
        targetType,
        targetId: String(form.get("targetId")),
        contentId:
          emergencyKind === "content" ? String(form.get("mediaId")) : null,
        playlistId:
          emergencyKind === "playlist" ? String(form.get("mediaId")) : null,
        endsAt: new Date(String(form.get("endsAt"))).toISOString(),
      };
      await persistEmergency(payload);
      setEmergencyOpen(false);
      await load();
      toast.success("Emergência ativada");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao criar emergência",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(path: string, message: string) {
    if (!window.confirm(message)) return;
    const response = await fetch(path, { method: "DELETE" });
    if (!response.ok) return toast.error(await responseErrorMessage(response));
    await load();
    toast.success("Registro removido");
  }

  async function changeScheduleStatus(id: string, status: "active" | "paused") {
    setBusy(true);
    try {
      await persistScheduleStatus(id, status);
      await load();
      toast.success(
        status === "active" ? "Agendamento ativado" : "Agendamento pausado",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Falha ao alterar o agendamento",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Programação"
        title="Agenda e emergência"
        description="Defina períodos, prioridades e conteúdo emergencial com expiração."
        action={
          <Button onClick={() => setScheduleOpen(true)}>
            <Plus /> Novo agendamento
          </Button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Próximos eventos</CardTitle>
            <CardDescription>
              Horários exibidos no fuso local do navegador.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.schedules.map((event) => {
              const playlist = data.playlists.find(
                (item) => item.id === event.playlistId,
              );
              const target = (
                event.targetType === "channel" ? data.channels : data.devices
              ).find((item) => item.id === event.targetId);
              const effectiveStatus: ScheduleStatus =
                event.endsAt && new Date(event.endsAt) <= new Date()
                  ? "expired"
                  : event.status;
              const nextStatus =
                effectiveStatus === "active" ? "paused" : "active";
              return (
                <div
                  key={event.id}
                  className="flex items-center gap-4 rounded-xl border p-4"
                >
                  <span className="grid size-12 place-items-center rounded-lg bg-primary/10 text-center font-mono text-[10px] font-semibold text-primary">
                    {new Date(event.startsAt)
                      .toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                      })
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {playlist?.name ?? "Playlist removida"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {event.targetType === "channel" ? "Canal" : "Dispositivo"}{" "}
                      · {target?.name ?? "Destino removido"} ·{" "}
                      {fmt(event.startsAt)}
                      {event.endsAt ? ` — ${fmt(event.endsAt)}` : " — contínuo"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant={
                        effectiveStatus === "active" ? "default" : "secondary"
                      }
                    >
                      {effectiveStatus === "active"
                        ? "Ativo"
                        : effectiveStatus === "paused"
                          ? "Pausado"
                          : "Encerrado"}
                    </Badge>
                    <Badge variant="secondary">P{event.priority}</Badge>
                    {effectiveStatus !== "expired" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={busy}
                        aria-label={
                          nextStatus === "active"
                            ? "Ativar agendamento"
                            : "Pausar agendamento"
                        }
                        onClick={() =>
                          void changeScheduleStatus(event.id, nextStatus)
                        }
                      >
                        {nextStatus === "active" ? <Play /> : <Pause />}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir agendamento"
                      onClick={() =>
                        void remove(
                          `/api/admin/resources/schedules/${event.id}`,
                          "Excluir este agendamento?",
                        )
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              );
            })}
            {!data.schedules.length && (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Nenhum agendamento criado.
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-amber-500/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CircleAlert className="size-5 text-amber-400" />
              <CardTitle>Conteúdo emergencial</CardTitle>
            </div>
            <CardDescription>
              Override temporário, com expiração e auditoria.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.emergencies.map((item) => {
              const media = item.contentId
                ? data.contents.find((entry) => entry.id === item.contentId)
                : data.playlists.find((entry) => entry.id === item.playlistId);
              return (
                <div key={item.id} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        {media?.name ?? "Conteúdo"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Ativo até {fmt(item.endsAt)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        void remove(
                          `/api/admin/emergency/${item.id}`,
                          "Encerrar esta emergência agora?",
                        )
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              );
            })}
            {!data.emergencies.length && (
              <div className="rounded-xl border border-dashed p-6 text-center">
                <CalendarClock className="mx-auto mb-3 size-8 text-muted-foreground" />
                <p className="text-sm font-medium">Nenhum override ativo</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Programação normal está sendo exibida.
                </p>
              </div>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setEmergencyOpen(true)}
            >
              Criar emergência
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <form onSubmit={createSchedule}>
            <DialogHeader>
              <DialogTitle>Novo agendamento</DialogTitle>
              <DialogDescription>
                Escolha destino, playlist e período.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-5">
              <TargetFields
                targetType={targetType}
                setTargetType={setTargetType}
                targets={targets}
              />
              <div className="space-y-2">
                <Label>Playlist</Label>
                <Select name="playlistId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.playlists
                      .filter((item) => item.status === "published")
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="startsAt">Início</Label>
                  <Input
                    id="startsAt"
                    name="startsAt"
                    type="datetime-local"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endsAt">Término</Label>
                  <Input id="endsAt" name="endsAt" type="datetime-local" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Input
                  id="priority"
                  name="priority"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={0}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setScheduleOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={busy}>
                Criar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={emergencyOpen} onOpenChange={setEmergencyOpen}>
        <DialogContent>
          <form onSubmit={createEmergency}>
            <DialogHeader>
              <DialogTitle>Criar emergência</DialogTitle>
              <DialogDescription>
                O conteúdo escolhido substitui a programação até o horário
                definido.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-5">
              <TargetFields
                targetType={targetType}
                setTargetType={setTargetType}
                targets={targets}
              />
              <div className="space-y-2">
                <Label>Tipo de mídia</Label>
                <Select
                  value={emergencyKind}
                  onValueChange={(value) =>
                    setEmergencyKind(value as "content" | "playlist")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="content">Conteúdo</SelectItem>
                    <SelectItem value="playlist">Playlist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  {emergencyKind === "content" ? "Conteúdo" : "Playlist"}
                </Label>
                <Select name="mediaId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(emergencyKind === "content"
                      ? data.contents.filter((item) => item.status === "active")
                      : data.playlists.filter(
                          (item) => item.status === "published",
                        )
                    ).map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyEndsAt">Expira em</Label>
                <Input
                  id="emergencyEndsAt"
                  name="endsAt"
                  type="datetime-local"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEmergencyOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={busy}>
                Ativar emergência
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TargetFields({
  targetType,
  setTargetType,
  targets,
}: {
  targetType: "channel" | "device";
  setTargetType: (value: "channel" | "device") => void;
  targets: Resource[];
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>Tipo de destino</Label>
        <Select
          value={targetType}
          onValueChange={(value) =>
            setTargetType(value as "channel" | "device")
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="channel">Canal</SelectItem>
            <SelectItem value="device">Dispositivo</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Destino</Label>
        <Select name="targetId" required>
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {targets.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
