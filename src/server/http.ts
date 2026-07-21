import { ZodError } from "zod";

export async function api<T>(work: () => Promise<T>) {
  try {
    return Response.json(await work());
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof ZodError) return Response.json({ error: "Dados inválidos", fields: error.flatten().fieldErrors }, { status: 422 });
    console.error("api_error", error instanceof Error ? { name: error.name, message: error.message } : { name: "unknown" });
    return Response.json({ error: "Falha interna" }, { status: 500 });
  }
}
