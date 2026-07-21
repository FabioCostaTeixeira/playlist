import { z } from "zod";

const safeHttpsUrl = z
  .url("URL inválida")
  .refine((value) => new URL(value).protocol === "https:", "Use somente HTTPS")
  .refine((value) => {
    const host = new URL(value).hostname.toLowerCase();
    return host !== "localhost" && host !== "127.0.0.1" && host !== "::1" && !host.endsWith(".local");
  }, "Destino local ou privado não permitido");

export const contentInput = z
  .object({
    name: z.string().trim().min(2).max(120),
    type: z.enum(["url", "image", "video", "html"]),
    status: z.enum(["draft", "active", "archived"]).default("draft"),
    sourceUrl: z.string().trim().optional().nullable(),
    blobPath: z.string().trim().max(2048).optional().nullable(),
    html: z.string().max(250_000).optional().nullable(),
    defaultDurationSeconds: z.coerce.number().int().min(3).max(86400).default(10),
  })
  .superRefine((value, ctx) => {
    if (value.type === "url") {
      const parsed = safeHttpsUrl.safeParse(value.sourceUrl);
      if (!parsed.success) ctx.addIssue({ code: "custom", path: ["sourceUrl"], message: parsed.error.issues[0]?.message ?? "URL inválida" });
    }
    if (["image", "video"].includes(value.type) && !value.blobPath) ctx.addIssue({ code: "custom", path: ["blobPath"], message: "Arquivo obrigatório" });
    if (value.type === "html" && !value.html) ctx.addIssue({ code: "custom", path: ["html"], message: "HTML obrigatório" });
  });

export const playlistInput = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

export const channelInput = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  activePlaylistId: z.uuid().optional().nullable(),
  fallbackPlaylistId: z.uuid().optional().nullable(),
});

export const deviceInput = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  location: z.string().trim().max(160).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  status: z.enum(["pending", "active", "blocked", "archived"]).default("pending"),
  orientation: z.enum(["landscape", "portrait", "auto"]).default("auto"),
  channelId: z.uuid().optional().nullable(),
});

export const scheduleInput = z
  .object({
    targetType: z.enum(["channel", "device"]),
    targetId: z.uuid(),
    playlistId: z.uuid(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date().optional().nullable(),
    priority: z.coerce.number().int().min(0).max(100).default(0),
    timezone: z.string().trim().min(3).max(80),
  })
  .refine((value) => !value.endsAt || value.endsAt > value.startsAt, { path: ["endsAt"], message: "Término deve ser posterior ao início" });

export const emergencyInput = z
  .object({
    targetType: z.enum(["channel", "device"]),
    targetId: z.uuid().optional().nullable(),
    contentId: z.uuid().optional().nullable(),
    playlistId: z.uuid().optional().nullable(),
    endsAt: z.coerce.date(),
  })
  .refine((value) => Boolean(value.contentId) !== Boolean(value.playlistId), "Informe conteúdo ou playlist, nunca ambos")
  .refine((value) => value.endsAt > new Date(), { path: ["endsAt"], message: "Expiração obrigatoriamente futura" });

export const pairingInput = z.object({ code: z.string().regex(/^\d{6}$/) });
export const heartbeatInput = z.object({ resolutionWidth: z.number().int().positive().max(16384).optional(), resolutionHeight: z.number().int().positive().max(16384).optional(), playerVersion: z.string().max(40).optional() });
export const eventBatchInput = z.object({ batchId: z.uuid(), events: z.array(z.object({ type: z.string().max(40), contentId: z.uuid().optional(), at: z.iso.datetime() })).max(500) });

export type ResourceName = "contents" | "playlists" | "channels" | "devices" | "schedules";
export const resourceName = z.enum(["contents", "playlists", "channels", "devices", "schedules"]);
