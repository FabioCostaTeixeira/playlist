// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScheduleWorkspace } from "@/components/app/schedule-workspace";

const emptyPage = JSON.stringify({ data: [], page: 1, limit: 100, total: 0 });

function addFormField(form: HTMLFormElement, name: string, value: string) {
  form
    .querySelectorAll(`[name="${name}"]`)
    .forEach((element) => element.remove());
  const input = document.createElement("input");
  input.name = name;
  input.value = value;
  form.append(input);
}

describe("tela de programação", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) =>
        Promise.resolve(
          new Response(
            String(input).includes("/emergency") ? "[]" : emptyPage,
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          ),
        ),
      ),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("abre o formulário de novo agendamento", async () => {
    render(<ScheduleWorkspace />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /novo agendamento/i }));

    expect(
      screen.getByRole("dialog", { name: /novo agendamento/i }),
    ).toBeVisible();
    expect(screen.getByLabelText("Início")).toBeVisible();
    expect(screen.getByLabelText("Prioridade")).toBeVisible();
  });

  it("abre o formulário de conteúdo emergencial", async () => {
    render(<ScheduleWorkspace />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /criar emergência/i }));

    expect(
      screen.getByRole("dialog", { name: /criar emergência/i }),
    ).toBeVisible();
    expect(screen.getByLabelText("Expira em")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /ativar emergência/i }),
    ).toBeVisible();
  });

  it("envia e recarrega um novo agendamento", async () => {
    render(<ScheduleWorkspace />);
    const fetcher = vi.mocked(fetch);
    fireEvent.click(screen.getByRole("button", { name: /novo agendamento/i }));
    const dialog = screen.getByRole("dialog", { name: /novo agendamento/i });
    const form = dialog.querySelector("form")!;
    addFormField(form, "targetId", "11111111-1111-4111-8111-111111111111");
    addFormField(form, "playlistId", "22222222-2222-4222-8222-222222222222");
    fireEvent.change(screen.getByLabelText("Início"), {
      target: { value: "2099-07-22T09:00" },
    });
    fireEvent.change(screen.getByLabelText("Prioridade"), {
      target: { value: "20" },
    });

    fireEvent.submit(form);

    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        "/api/admin/resources/schedules",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const post = fetcher.mock.calls.find(
      ([url, init]) =>
        String(url) === "/api/admin/resources/schedules" &&
        init?.method === "POST",
    )!;
    expect(JSON.parse(String(post[1]?.body))).toMatchObject({
      targetType: "channel",
      targetId: "11111111-1111-4111-8111-111111111111",
      playlistId: "22222222-2222-4222-8222-222222222222",
      priority: 20,
      status: "active",
    });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: /novo agendamento/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it("envia e recarrega uma emergência", async () => {
    render(<ScheduleWorkspace />);
    const fetcher = vi.mocked(fetch);
    fireEvent.click(screen.getByRole("button", { name: /criar emergência/i }));
    const dialog = screen.getByRole("dialog", { name: /criar emergência/i });
    const form = dialog.querySelector("form")!;
    addFormField(form, "targetId", "11111111-1111-4111-8111-111111111111");
    addFormField(form, "mediaId", "22222222-2222-4222-8222-222222222222");
    fireEvent.change(screen.getByLabelText("Expira em"), {
      target: { value: "2099-07-22T14:00" },
    });

    fireEvent.submit(form);

    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        "/api/admin/emergency",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const post = fetcher.mock.calls.find(
      ([url, init]) =>
        String(url) === "/api/admin/emergency" && init?.method === "POST",
    )!;
    expect(JSON.parse(String(post[1]?.body))).toMatchObject({
      targetType: "channel",
      targetId: "11111111-1111-4111-8111-111111111111",
      contentId: "22222222-2222-4222-8222-222222222222",
      playlistId: null,
    });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: /criar emergência/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it("persiste a pausa de um agendamento ativo", async () => {
    const schedule = {
      id: "33333333-3333-4333-8333-333333333333",
      targetType: "channel",
      targetId: "11111111-1111-4111-8111-111111111111",
      playlistId: "22222222-2222-4222-8222-222222222222",
      startsAt: "2099-07-22T12:00:00.000Z",
      endsAt: null,
      priority: 10,
      timezone: "America/Sao_Paulo",
      status: "active",
    };
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (init?.method === "PATCH")
          return new Response(
            JSON.stringify({ ...schedule, status: "paused" }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          );
        const data = url.includes("/schedules?")
          ? [schedule]
          : url.includes("/playlists?")
            ? [
                {
                  id: schedule.playlistId,
                  name: "Campanha",
                  status: "published",
                },
              ]
            : url.includes("/channels?")
              ? [{ id: schedule.targetId, name: "Recepção" }]
              : [];
        return new Response(
          url.includes("/emergency")
            ? "[]"
            : JSON.stringify({ data, page: 1, limit: 100, total: data.length }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      },
    );
    vi.stubGlobal("fetch", fetcher);
    render(<ScheduleWorkspace />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Pausar agendamento" }),
    );

    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        `/api/admin/resources/schedules/${schedule.id}`,
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "paused" }),
        }),
      ),
    );
  });
});
