"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/app/page-header";

type Row = { id: string; name: string; type?: string; status: string; detail: string; updated: string };
type Kind = "contents" | "playlists" | "channels" | "devices";

const copy: Record<Kind, { title: string; description: string; singular: string }> = {
  contents: { title: "Biblioteca de conteúdos", description: "Gerencie URLs, imagens, vídeos e HTML seguro usados nas telas.", singular: "conteúdo" },
  playlists: { title: "Playlists", description: "Organize conteúdo, duração e ordem antes de publicar versões imutáveis.", singular: "playlist" },
  channels: { title: "Canais", description: "Reutilize programação em vários dispositivos e publique via CDN.", singular: "canal" },
  devices: { title: "Dispositivos", description: "Ative telas por código temporário, associe canais e acompanhe presença.", singular: "dispositivo" },
};

const statusLabel: Record<string, string> = { active: "Ativo", draft: "Rascunho", published: "Publicado", pending: "Pendente", blocked: "Bloqueado", archived: "Arquivado", online: "Online", offline: "Offline" };

export function ResourceWorkspace({ kind, initialRows, demo }: { kind: Kind; initialRows: Row[]; demo: boolean }) {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => rows.filter((row) => row.name.toLowerCase().includes(query.toLowerCase())), [query, rows]);
  const text = copy[kind];
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name"));
    const type = String(form.get("type") || "draft");
    const payload = kind === "contents" ? { name, type, status: "draft", sourceUrl: type === "url" ? String(form.get("detail")) : undefined, html: type === "html" ? String(form.get("detail")) : undefined, blobPath: ["image", "video"].includes(type) ? String(form.get("detail")) : undefined, defaultDurationSeconds: 10 } : kind === "devices" ? { name, slug: name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), status: "pending", orientation: "auto", location: String(form.get("detail")) } : { name, description: String(form.get("detail")) };
    if (demo) {
      setRows((current) => [{ id: crypto.randomUUID(), name, type: kind === "contents" ? type : undefined, status: kind === "devices" ? "pending" : "draft", detail: String(form.get("detail") || "Novo registro"), updated: "agora" }, ...current]);
    } else {
      const response = await fetch(`/api/admin/resources/${kind}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) { toast.error("Não foi possível salvar"); return; }
      const result = await response.json() as { id: string };
      setRows((current) => [{ id: result.id, name, type: kind === "contents" ? type : undefined, status: kind === "devices" ? "pending" : "draft", detail: String(form.get("detail") || "Novo registro"), updated: "agora" }, ...current]);
    }
    toast.success(`${text.singular} criado`); setOpen(false);
  }
  async function remove(id: string) {
    if (!demo) { const response = await fetch(`/api/admin/resources/${kind}/${id}`, { method: "DELETE" }); if (!response.ok) return toast.error("Exclusão negada"); }
    setRows((current) => current.filter((row) => row.id !== id)); toast.success("Registro removido");
  }
  return <><PageHeader eyebrow="Operação" title={text.title} description={text.description} action={<Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus /> Novo {text.singular}</Button></DialogTrigger><DialogContent><form onSubmit={create}><DialogHeader><DialogTitle>Novo {text.singular}</DialogTitle><DialogDescription>Campos obrigatórios são validados no servidor.</DialogDescription></DialogHeader><div className="space-y-4 py-5"><div className="space-y-2"><Label htmlFor="name">Nome</Label><Input id="name" name="name" minLength={2} maxLength={120} required /></div>{kind === "contents" && <div className="space-y-2"><Label>Tipo</Label><Select name="type" defaultValue="url"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="url">URL HTTPS</SelectItem><SelectItem value="image">Imagem</SelectItem><SelectItem value="video">Vídeo</SelectItem><SelectItem value="html">HTML seguro</SelectItem></SelectContent></Select></div>}<div className="space-y-2"><Label htmlFor="detail">{kind === "contents" ? "Origem / HTML" : kind === "devices" ? "Local" : "Descrição"}</Label><Textarea id="detail" name="detail" maxLength={kind === "contents" ? 250000 : 500} /></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></DialogFooter></form></DialogContent></Dialog>} />
  <Card className="overflow-hidden"><div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome..." className="pl-9" /></div><span className="text-xs text-muted-foreground">{filtered.length} registros</span></div><Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead><TableHead className="hidden md:table-cell">Detalhes</TableHead><TableHead className="hidden sm:table-cell">Atualizado</TableHead><TableHead className="w-12"><span className="sr-only">Ações</span></TableHead></TableRow></TableHeader><TableBody>{filtered.map((row) => <TableRow key={row.id}><TableCell className="font-medium">{row.name}</TableCell><TableCell className="capitalize text-muted-foreground">{row.type ?? text.singular}</TableCell><TableCell><Badge variant={row.status === "active" || row.status === "online" || row.status === "published" ? "default" : "secondary"}>{statusLabel[row.status] ?? row.status}</Badge></TableCell><TableCell className="hidden max-w-xs truncate text-muted-foreground md:table-cell">{row.detail}</TableCell><TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">{row.updated}</TableCell><TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /><span className="sr-only">Ações</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem>Editar</DropdownMenuItem><DropdownMenuItem className="text-destructive" onClick={() => remove(row.id)}><Trash2 /> Excluir</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>)}{!filtered.length && <TableRow><TableCell colSpan={6} className="h-28 text-center text-muted-foreground">Nenhum registro encontrado.</TableCell></TableRow>}</TableBody></Table></Card></>;
}
