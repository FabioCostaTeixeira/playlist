"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Activity, CalendarClock, ChevronRight, CirclePlay, FileStack, LayoutDashboard, ListVideo, Menu, Monitor, Radio, ScrollText, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/conteudos", label: "Conteúdos", icon: FileStack },
  { href: "/playlists", label: "Playlists", icon: ListVideo },
  { href: "/canais", label: "Canais", icon: Radio },
  { href: "/dispositivos", label: "Dispositivos", icon: Monitor },
  { href: "/usuarios", label: "Usuários e acesso", icon: Users },
  { href: "/agenda", label: "Programação", icon: CalendarClock },
  { href: "/auditoria", label: "Auditoria", icon: ScrollText },
];

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <nav aria-label="Navegação principal" className="space-y-1">{nav.map((item) => { const active = pathname === item.href; return <Link key={item.href} href={item.href} onClick={onNavigate} className={cn("group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition", active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><item.icon className="size-4" aria-hidden /><span className="flex-1">{item.label}</span>{active && <ChevronRight className="size-3.5" />}</Link>; })}</nav>;
}

export function AppShell({ children, organization = "Nexus Digital", demo = false }: { children: React.ReactNode; organization?: string; demo?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return <div className="min-h-screen bg-background text-foreground">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-card/70 p-5 backdrop-blur-xl lg:block">
      <Link href="/dashboard" className="mb-7 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><CirclePlay className="size-5" /></span><span><strong className="block leading-none">Playlist</strong><small className="text-muted-foreground">Digital signage</small></span></Link>
      <Navigation />
      <div className="absolute inset-x-5 bottom-5 rounded-xl border bg-background/60 p-3"><div className="flex items-center gap-2 text-xs"><ShieldCheck className="size-4 text-primary" /><span className="font-medium">Ambiente seguro</span></div><p className="mt-1 text-[11px] text-muted-foreground">Tenant isolado · auditoria ativa</p></div>
    </aside>
    <div className="lg:pl-64">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-xl sm:px-7">
        <div className="flex items-center gap-3"><Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden"><Menu className="size-5" /><span className="sr-only">Abrir menu</span></Button></SheetTrigger><SheetContent side="left" className="w-72 p-5"><SheetTitle className="mb-6 flex items-center gap-2"><CirclePlay className="text-primary" /> Playlist</SheetTitle><Navigation onNavigate={() => setMobileOpen(false)} /></SheetContent></Sheet><div><p className="text-sm font-medium">{organization}</p><p className="text-xs text-muted-foreground">America/Sao_Paulo</p></div></div>
        <div className="flex items-center gap-3">{demo && <Badge variant="outline" className="border-amber-500/30 text-amber-300">Modo demonstração</Badge>}<Link href="/player" target="_blank"><Button variant="outline" size="sm"><CirclePlay className="size-4" /> Abrir player</Button></Link><span className="grid size-8 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">AD</span></div>
      </header>
      <main className="p-4 sm:p-7">{demo && <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm"><Activity className="mt-0.5 size-4 text-amber-300" /><div><strong>Interface com dados de demonstração.</strong><p className="text-muted-foreground">Configure banco e execute seed para persistência real.</p></div></div>}{children}</main>
    </div>
  </div>;
}
