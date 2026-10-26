"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogIn } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const UNAVAILABLE_MESSAGE = "Serviço temporariamente indisponível. Tente novamente em alguns minutos.";

type LoginError = { status?: number; statusCode?: number; code?: string } | Error | null | undefined;

export function getLoginErrorMessage(error: LoginError) {
  if (error instanceof Error) return UNAVAILABLE_MESSAGE;
  if (error && typeof error === "object") {
    const status = typeof error.status === "number" ? error.status : error.statusCode;
    const code = "code" in error ? error.code : undefined;
    if (status === 429) return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    if (status === 401 || code === "INVALID_EMAIL_OR_PASSWORD") return "E-mail ou senha inválidos.";
    if (typeof status === "number" && status >= 500) return UNAVAILABLE_MESSAGE;
  }
  return UNAVAILABLE_MESSAGE;
}

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    let result;
    try {
      result = await authClient.signIn.email({ email: String(form.get("email")), password: String(form.get("password")), rememberMe: true });
    } catch {
      setError(UNAVAILABLE_MESSAGE);
      return;
    } finally {
      setPending(false);
    }
    if (result.error) return setError(getLoginErrorMessage(result.error));
    router.replace("/dashboard"); router.refresh();
  }
  return <form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div><div className="space-y-2"><Label htmlFor="password">Senha</Label><Input id="password" name="password" type="password" autoComplete="current-password" minLength={12} required /></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button className="w-full" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <LogIn />} Entrar</Button></form>;
}
