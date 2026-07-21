import { describe, expect, it, vi } from "vitest";
import {
  persistEmergency,
  persistSchedule,
  persistScheduleStatus,
} from "@/components/app/schedule-actions";
import { scheduleInput, schedulePatchInput } from "@/shared/schemas";

const response = (body: unknown = { id: "created" }, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("ações persistentes da programação", () => {
  it("ativa novos agendamentos por padrão e permite pausá-los", () => {
    const base = {
      targetType: "channel" as const,
      targetId: "11111111-1111-4111-8111-111111111111",
      playlistId: "22222222-2222-4222-8222-222222222222",
      startsAt: "2026-07-22T12:00:00.000Z",
      timezone: "America/Sao_Paulo",
    };

    expect(scheduleInput.parse(base).status).toBe("active");
    expect(schedulePatchInput.parse({ status: "paused" })).toEqual({
      status: "paused",
    });
  });

  it("cria um agendamento ativo pela API administrativa", async () => {
    const fetcher = vi.fn(async () => response());
    const payload = {
      targetType: "channel" as const,
      targetId: "11111111-1111-4111-8111-111111111111",
      playlistId: "22222222-2222-4222-8222-222222222222",
      startsAt: "2026-07-22T12:00:00.000Z",
      endsAt: null,
      priority: 10,
      timezone: "America/Sao_Paulo",
      status: "active" as const,
    };

    await persistSchedule(payload, fetcher);

    expect(fetcher).toHaveBeenCalledWith(
      "/api/admin/resources/schedules",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  });

  it("cria uma emergência pela API administrativa", async () => {
    const fetcher = vi.fn(async () => response());
    const payload = {
      targetType: "device" as const,
      targetId: "11111111-1111-4111-8111-111111111111",
      contentId: "22222222-2222-4222-8222-222222222222",
      playlistId: null,
      endsAt: "2026-07-22T14:00:00.000Z",
    };

    await persistEmergency(payload, fetcher);

    expect(fetcher).toHaveBeenCalledWith(
      "/api/admin/emergency",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  });

  it("pausa ou ativa um agendamento existente", async () => {
    const fetcher = vi.fn(async () => response());

    await persistScheduleStatus("schedule-id", "paused", fetcher);

    expect(fetcher).toHaveBeenCalledWith(
      "/api/admin/resources/schedules/schedule-id",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "paused" }),
      }),
    );
  });

  it("expõe a mensagem retornada pela API quando a persistência falha", async () => {
    const fetcher = vi.fn(async () =>
      response({ error: "Playlist indisponível" }, 422),
    );

    await expect(
      persistSchedule(
        {
          targetType: "channel",
          targetId: "11111111-1111-4111-8111-111111111111",
          playlistId: "22222222-2222-4222-8222-222222222222",
          startsAt: "2026-07-22T12:00:00.000Z",
          endsAt: null,
          priority: 0,
          timezone: "America/Sao_Paulo",
          status: "active",
        },
        fetcher,
      ),
    ).rejects.toThrow("Playlist indisponível");
  });
});
