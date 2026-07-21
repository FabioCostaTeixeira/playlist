import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

describe("resolução da programação do player", () => {
  it("resolve emergência antes da agenda e da programação normal", () => {
    const bootstrap = read("src/app/api/player/bootstrap/route.ts");
    const emergency = bootstrap.indexOf("emergencyOverrides");
    const schedule = bootstrap.indexOf("schedules");
    const direct = bootstrap.indexOf("device.directPlaylistId");

    expect(emergency).toBeGreaterThan(-1);
    expect(schedule).toBeGreaterThan(emergency);
    expect(direct).toBeGreaterThan(schedule);
    expect(bootstrap).toContain('eq(schedules.status, "active")');
    expect(bootstrap).toContain("desc(schedules.priority)");
  });

  it("reconsulta o bootstrap e aceita manifesto emergencial inline", () => {
    const player = read("src/features/player/player-engine.tsx");

    expect(player).toContain('authFetch("/api/player/bootstrap")');
    expect(player).toContain("data.manifest");
    expect(player).toContain("next.playlistId === manifest?.playlistId");
    expect(player).toContain("if (data.manifest) {");
    expect(player).toContain('pointerRef.current = ""');
    expect(player).toContain('etagRef.current = ""');
  });

  it("resolve a playlist ativa mesmo quando o canal foi criado após a publicação", () => {
    const bootstrap = read("src/app/api/player/bootstrap/route.ts");

    expect(bootstrap).toContain("activePlaylistId: channels.activePlaylistId");
    expect(bootstrap).toContain("channel.activePlaylistId");
    expect(bootstrap).toContain("publishedPlaylist(");
  });
});
