"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogIn } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({ email: String(form.get("email")), password: String(form.get("password")), rememberMe: true });
    setPending(false);
    if (result.error) return setError("E-mail ou senha inválidos.");
    router.replace("/dashboard"); router.refresh();
  }
  return <form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div><div className="space-y-2"><Label htmlFor="password">Senha</Label><Input id="password" name="password" type="password" autoComplete="current-password" minLength={12} required /></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button className="w-full" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <LogIn />} Entrar</Button></form>;
}
