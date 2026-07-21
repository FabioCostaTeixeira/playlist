export type ScheduleStatus = "active" | "paused" | "expired";

export type SchedulePayload = {
  targetType: "channel" | "device";
  targetId: string;
  playlistId: string;
  startsAt: string;
  endsAt: string | null;
  priority: number;
  timezone: string;
  status: "active" | "paused";
};

export type EmergencyPayload = {
  targetType: "channel" | "device";
  targetId: string | null;
  contentId: string | null;
  playlistId: string | null;
  endsAt: string;
};

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export async function responseErrorMessage(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
    fields?: Record<string, string[]>;
  } | null;
  return (
    Object.values(body?.fields ?? {}).flat()[0] ??
    body?.error ??
    `Erro ${response.status}`
  );
}

async function persist<T>(
  url: string,
  method: "POST" | "PATCH",
  payload: unknown,
  fetcher: Fetcher,
) {
  const response = await fetcher(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await responseErrorMessage(response));
  return (await response.json()) as T;
}

export function persistSchedule(
  payload: SchedulePayload,
  fetcher: Fetcher = fetch,
) {
  return persist<{ id: string }>(
    "/api/admin/resources/schedules",
    "POST",
    payload,
    fetcher,
  );
}

export function persistEmergency(
  payload: EmergencyPayload,
  fetcher: Fetcher = fetch,
) {
  return persist<{ id: string }>(
    "/api/admin/emergency",
    "POST",
    payload,
    fetcher,
  );
}

export function persistScheduleStatus(
  id: string,
  status: "active" | "paused",
  fetcher: Fetcher = fetch,
) {
  return persist<{ id: string }>(
    `/api/admin/resources/schedules/${id}`,
    "PATCH",
    { status },
    fetcher,
  );
}
