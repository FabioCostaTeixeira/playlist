import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("account_user_idx").on(table.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const organizationStatus = pgEnum("organization_status", ["active", "suspended"]);
export const contentType = pgEnum("content_type", ["url", "image", "video", "html"]);
export const contentStatus = pgEnum("content_status", ["draft", "active", "archived"]);
export const playlistStatus = pgEnum("playlist_status", ["draft", "published", "archived"]);
export const deviceStatus = pgEnum("device_status", ["pending", "active", "blocked", "archived"]);
export const orientation = pgEnum("orientation", ["landscape", "portrait", "auto"]);
export const targetType = pgEnum("target_type", ["channel", "device"]);
export const scheduleStatus = pgEnum("schedule_status", ["active", "paused", "expired"]);
export const roleKey = pgEnum("role_key", ["admin", "editor", "operator", "viewer"]);

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: organizationStatus("status").default("active").notNull(),
  timezone: text("timezone").default("America/Sao_Paulo").notNull(),
  ...timestamps,
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    role: roleKey("role").default("viewer").notNull(),
    status: text("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.organizationId, table.userId] }), index("member_user_idx").on(table.userId)],
);

export const contents = pgTable(
  "contents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: contentType("type").notNull(),
    status: contentStatus("status").default("draft").notNull(),
    sourceUrl: text("source_url"),
    blobPath: text("blob_path"),
    mimeType: text("mime_type"),
    fileSize: integer("file_size"),
    checksum: text("checksum"),
    defaultDurationSeconds: integer("default_duration_seconds").default(10),
    iframeCompatibility: text("iframe_compatibility").default("unknown").notNull(),
    htmlMode: text("html_mode"),
    htmlSafe: text("html_safe"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdBy: text("created_by").references(() => user.id),
    ...timestamps,
  },
  (table) => [index("contents_tenant_status_idx").on(table.organizationId, table.status), index("contents_tenant_name_idx").on(table.organizationId, table.name)],
);

export const playlists = pgTable(
  "playlists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: playlistStatus("status").default("draft").notNull(),
    currentVersion: integer("current_version").default(0).notNull(),
    manifestUrl: text("manifest_url"),
    ...timestamps,
  },
  (table) => [index("playlists_tenant_idx").on(table.organizationId)],
);

export const playlistItems = pgTable(
  "playlist_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playlistId: uuid("playlist_id").notNull().references(() => playlists.id, { onDelete: "cascade" }),
    contentId: uuid("content_id").notNull().references(() => contents.id),
    position: integer("position").notNull(),
    durationSeconds: integer("duration_seconds"),
    transitionType: text("transition_type").default("fade").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
  },
  (table) => [uniqueIndex("playlist_position_unique").on(table.playlistId, table.position)],
);

export const channels = pgTable(
  "channels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    activePlaylistId: uuid("active_playlist_id").references(() => playlists.id),
    fallbackPlaylistId: uuid("fallback_playlist_id").references(() => playlists.id),
    currentVersion: integer("current_version").default(0).notNull(),
    pointerUrl: text("pointer_url"),
    ...timestamps,
  },
  (table) => [index("channels_tenant_idx").on(table.organizationId)],
);

export const devices = pgTable(
  "devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    location: text("location"),
    description: text("description"),
    status: deviceStatus("status").default("pending").notNull(),
    orientation: orientation("orientation").default("auto").notNull(),
    resolutionWidth: integer("resolution_width"),
    resolutionHeight: integer("resolution_height"),
    channelId: uuid("channel_id").references(() => channels.id),
    directPlaylistId: uuid("direct_playlist_id").references(() => playlists.id),
    currentManifestVersion: integer("current_manifest_version").default(0).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    lastIpHash: text("last_ip_hash"),
    userAgentSummary: text("user_agent_summary"),
    ...timestamps,
  },
  (table) => [uniqueIndex("device_tenant_slug_unique").on(table.organizationId, table.slug), index("device_last_seen_idx").on(table.organizationId, table.lastSeenAt)],
);

export const deviceTokens = pgTable(
  "device_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deviceId: uuid("device_id").notNull().references(() => devices.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("device_token_device_idx").on(table.deviceId)],
);

export const pairingCodes = pgTable(
  "pairing_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deviceId: uuid("device_id").notNull().references(() => devices.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").default(0).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("pairing_device_idx").on(table.deviceId)],
);

export const schedules = pgTable(
  "schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    targetType: targetType("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    playlistId: uuid("playlist_id").notNull().references(() => playlists.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    priority: integer("priority").default(0).notNull(),
    timezone: text("timezone").notNull(),
    status: scheduleStatus("status").default("active").notNull(),
    ...timestamps,
  },
  (table) => [index("schedule_resolution_idx").on(table.organizationId, table.targetType, table.targetId, table.startsAt, table.endsAt)],
);

export const emergencyOverrides = pgTable("emergency_overrides", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  targetType: targetType("target_type").notNull(),
  targetId: uuid("target_id"),
  contentId: uuid("content_id").references(() => contents.id),
  playlistId: uuid("playlist_id").references(() => playlists.id),
  startsAt: timestamp("starts_at", { withTimezone: true }).defaultNow().notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  status: scheduleStatus("status").default("active").notNull(),
  createdBy: text("created_by").references(() => user.id),
  ...timestamps,
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => user.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    beforeSafe: jsonb("before_safe").$type<Record<string, unknown>>(),
    afterSafe: jsonb("after_safe").$type<Record<string, unknown>>(),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("audit_tenant_created_idx").on(table.organizationId, table.createdAt)],
);

export const playbackEventBatches = pgTable(
  "playback_event_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deviceId: uuid("device_id").notNull().references(() => devices.id, { onDelete: "cascade" }),
    batchId: text("batch_id").notNull().unique(),
    eventCount: integer("event_count").notNull(),
    events: jsonb("events").$type<Array<Record<string, unknown>>>().default([]).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("playback_device_received_idx").on(table.deviceId, table.receivedAt)],
);
