import { and, count, desc, eq, gt, isNotNull, sql } from "drizzle-orm";
import {
  Activity,
  ListVideo,
  Monitor,
  Radio,
  TriangleAlert,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getDb } from "@/db";
import { auditLogs, channels, contents, devices, playlists } from "@/db/schema";
import { requireActor } from "@/server/access";

export default async function DashboardPage() {
  const actor = await requireActor();
  const [
    [deviceTotal],
    [onlineTotal],
    [channelTotal],
    [contentTotal],
    [draftTotal],
    [publishedTotal],
    recent,
  ] = await Promise.all([
    getDb()
      .select({ value: count() })
      .from(devices)
      .where(
        and(
          eq(devices.organizationId, actor.organizationId),
          eq(devices.status, "active"),
        ),
      ),
    getDb()
      .select({ value: count() })
      .from(devices)
      .where(
        and(
          eq(devices.organizationId, actor.organizationId),
          eq(devices.status, "active"),
        gt(devices.lastSeenAt, sql<Date>`now() - interval '10 minutes'`),
        ),
      ),
    getDb()
      .select({ value: count() })
      .from(channels)
      .where(
        and(
          eq(channels.organizationId, actor.organizationId),
          isNotNull(channels.activePlaylistId),
        ),
      ),
    getDb()
      .select({ value: count() })
      .from(contents)
      .where(eq(contents.organizationId, actor.organizationId)),
    getDb()
      .select({ value: count() })
      .from(contents)
      .where(
        and(
          eq(contents.organizationId, actor.organizationId),
          eq(contents.status, "draft"),
        ),
      ),
    getDb()
      .select({ value: count() })
      .from(playlists)
      .where(
        and(
          eq(playlists.organizationId, actor.organizationId),
          eq(playlists.status, "published"),
        ),
      ),
    getDb()
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.organizationId, actor.organizationId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(6),
  ]);
  const activeDevices = deviceTotal?.value ?? 0;
  const online = onlineTotal?.value ?? 0;
  const onlinePercent = activeDevices
    ? Math.round((online / activeDevices) * 100)
    : 0;
  const stats = [
    {
      label: "Telas online",
      value: String(online),
      note: `de ${activeDevices} ativas`,
      icon: Monitor,
    },
    {
      label: "Canais configurados",
      value: String(channelTotal?.value ?? 0),
      note: "com playlist ativa",
      icon: Radio,
    },
    {
      label: "Conteúdos",
      value: String(contentTotal?.value ?? 0),
      note: `${draftTotal?.value ?? 0} em rascunho`,
      icon: Activity,
    },
    {
      label: "Playlists publicadas",
      value: String(publishedTotal?.value ?? 0),
      note: "disponíveis para canais",
      icon: ListVideo,
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Painel operacional"
        title={`Olá, ${actor.organizationName}`}
        description="Dados atuais da rede e mudanças administrativas recentes."
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardDescription>{stat.label}</CardDescription>
                <CardTitle className="mt-2 text-3xl font-semibold">
                  {stat.value}
                </CardTitle>
              </div>
              <span className="rounded-lg bg-primary/10 p-2 text-primary">
                <stat.icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {stat.note}
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Atividade recente</CardTitle>
            <CardDescription>Eventos administrativos reais.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {recent.map((event) => (
              <div key={event.id} className="flex gap-3">
                <span className="mt-1 size-2 rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {event.action} · {event.entityType}
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {event.entityId}
                  </p>
                </div>
                <time className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(event.createdAt)}
                </time>
              </div>
            ))}
            {!recent.length && (
              <p className="text-sm text-muted-foreground">
                Nenhuma atividade registrada.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Saúde da rede</CardTitle>
              <Badge variant="outline">Agora</Badge>
            </div>
            <CardDescription>
              Online significa heartbeat nos últimos 10 minutos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span>Dispositivos online</span>
                <span className="font-mono">{onlinePercent}%</span>
              </div>
              <Progress value={onlinePercent} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <Monitor className="mb-2 size-4 text-primary" />
                <p className="text-xl font-semibold">{online}</p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
              <div className="rounded-lg border p-3">
                <TriangleAlert className="mb-2 size-4 text-amber-400" />
                <p className="text-xl font-semibold">
                  {Math.max(0, activeDevices - online)}
                </p>
                <p className="text-xs text-muted-foreground">Offline</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
