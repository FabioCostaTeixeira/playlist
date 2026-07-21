import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import sanitizeHtml from "sanitize-html";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function generateDeviceToken() {
  return randomBytes(32).toString("base64url");
}

export function generatePairingCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function safeHashEqual(rawValue: string, expectedHash: string) {
  const actual = Buffer.from(sha256(rawValue));
  const expected = Buffer.from(expectedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function sanitizeUserHtml(value: string) {
  return sanitizeHtml(value, {
    allowedTags: ["div", "section", "main", "header", "footer", "h1", "h2", "h3", "p", "span", "strong", "em", "ul", "ol", "li", "img", "video", "source", "br"],
    allowedAttributes: { "*": ["class", "style"], img: ["src", "alt", "width", "height"], video: ["src", "autoplay", "muted", "loop", "playsinline"], source: ["src", "type"] },
    allowedSchemes: ["https"],
    allowedStyles: { "*": { color: [/^#[0-9a-f]{3,8}$/i, /^rgb/], "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgb/], "font-size": [/^\d+(?:px|rem|em|vw)$/], "text-align": [/^(left|right|center)$/], width: [/^\d+(?:px|%|vw)$/], height: [/^\d+(?:px|%|vh)$/] } },
    disallowedTagsMode: "discard",
  });
}

export function redact(input: Record<string, unknown> | undefined) {
  if (!input) return undefined;
  const blocked = /password|token|secret|cookie|authorization|signed/i;
  return Object.fromEntries(Object.entries(input).filter(([key]) => !blocked.test(key)).map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 1000) : value]));
}
