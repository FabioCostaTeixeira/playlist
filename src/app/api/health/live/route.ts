export function GET() {
  return Response.json(
    { status: "ok", time: new Date().toISOString() },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
