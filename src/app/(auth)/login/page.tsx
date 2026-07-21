import { CirclePlay, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/app/login-form";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  return <main className="grid min-h-screen place-items-center p-5"><div className="w-full max-w-sm"><div className="mb-6 flex justify-center"><span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><CirclePlay /></span></div><Card><CardHeader><CardTitle><h1>Bem-vindo de volta</h1></CardTitle><CardDescription>Acesse central de programação.</CardDescription></CardHeader><CardContent><LoginForm /></CardContent></Card><p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-3.5" /> Sessão segura e auditada</p></div></main>;
}
