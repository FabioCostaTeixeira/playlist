import { ZodError } from "zod";
import { captureException } from "@/server/observability";

export async function api<T>(work: () => Promise<T>) {
  try {
    return Response.json(await work());
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof ZodError)
      return Response.json(
        { error: "Dados inválidos", fields: error.flatten().fieldErrors },
        { status: 422 },
      );
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "23503"
    )
      return Response.json(
        { error: "Este registro está em uso e não pode ser excluído." },
        { status: 409 },
      );
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "23505"
    )
      return Response.json(
        { error: "Já existe um registro com estes dados." },
        { status: 409 },
      );
    const eventId = await captureException(error);
    return Response.json({ error: "Falha interna", eventId }, { status: 500 });
  }
}
