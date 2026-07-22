"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  CheckCircle2,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/app/page-header";

type Kind = "contents" | "playlists" | "channels" | "devices";
type Row = {
  id: string;
  name: string;
  type?: string;
  status?: string;
  description?: string | null;
  sourceUrl?: string | null;
  blobPath?: string | null;
  htmlSafe?: string | null;
  defaultDurationSeconds?: number | null;
  location?: string | null;
  slug?: string;
  orientation?: string;
  channelId?: string | null;
  activePlaylistId?: string | null;
  fallbackPlaylistId?: string | null;
  currentVersion?: number;
  lastSeenAt?: string | null;
  updatedAt?: string;
};
type Option = { id: string; name: string; status?: string };

const copy: Record<
  Kind,
  { title: string; description: string; singular: string }
> = {
  contents: {
    title: "Biblioteca de conteúdos",
    description: "Gerencie URLs, imagens, vídeos e HTML usados nas telas.",
    singular: "conteúdo",
  },
  playlists: {
    title: "Playlists",
    description:
      "Organize conteúdos e publique uma versão para os dispositivos.",
    singular: "playlist",
  },
  channels: {
    title: "Canais",
    description: "Associe uma playlist publicada a um ou mais dispositivos.",
    singular: "canal",
  },
  devices: {
    title: "Dispositivos",
    description:
      "Cadastre telas, gere códigos de pareamento e acompanhe presença.",
    singular: "dispositivo",
  },
};
const statusLabel: Record<string, string> = {
  active: "Ativo",
  draft: "Rascunho",
  published: "Publicado",
  pending: "Pendente",
  blocked: "Bloqueado",
  archived: "Arquivado",
  configured: "Configurado",
  empty: "Sem playlist",
};

async function responseError(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
    fields?: Record<string, string[]>;
  } | null;
  return (
    body?.error ??
    Object.values(body?.fields ?? {}).flat()[0] ??
    `Erro ${response.status}`
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function rowStatus(kind: Kind, row: Row) {
  return kind === "channels"
    ? row.activePlaylistId
      ? "configured"
      : "empty"
    : (row.status ?? "draft");
}

function rowDetail(
  kind: Kind,
  row: Row,
  options: { playlists: Option[]; channels: Option[] },
) {
  if (kind === "contents")
    return row.type === "url"
      ? row.sourceUrl
      : row.type === "html"
        ? "HTML armazenado"
        : row.blobPath;
  if (kind === "playlists")
    return `${row.currentVersion ?? 0} versão(ões) publicada(s)${row.description ? ` · ${row.description}` : ""}`;
  if (kind === "channels")
    return (
      options.playlists.find((item) => item.id === row.activePlaylistId)
        ?.name ??
      row.description ??
      "Nenhuma playlist ativa"
    );
  return `${row.location ?? "Local não informado"}${row.channelId ? ` · ${options.channels.find((item) => item.id === row.channelId)?.name ?? "Canal"}` : ""}`;
}

export function ResourceWorkspace({
  kind,
  enabled = true,
}: {
  kind: Kind;
  enabled?: boolean;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [options, setOptions] = useState<{
    playlists: Option[];
    channels: Option[];
    contents: Option[];
  }>({ playlists: [], channels: [], contents: [] });
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contentType, setContentType] = useState("url");
  const [pairing, setPairing] = useState<{
    code: string;
    expiresAt: string;
    deviceName: string;
  } | null>(null);
  const [playlistEditor, setPlaylistEditor] = useState<Row | null>(null);
  const [playlistItems, setPlaylistItems] = useState<
    Array<{ contentId: string; durationSeconds: number }>
  >([]);
  // Acompanha o domínio real em qualquer ambiente, sem endereço fixo no código.
  // Só é exibido dentro do diálogo, que nunca renderiza no servidor, então não
  // há divergência de hidratação.
  const playerUrl =
    typeof window === "undefined"
      ? "/player"
      : `${window.location.origin}/player`;
  const text = copy[kind];

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const wanted = new Set<string>([kind]);
      if (kind === "channels" || kind === "devices") wanted.add("playlists");
      if (kind === "devices") wanted.add("channels");
      if (kind === "playlists") wanted.add("contents");
      const entries = await Promise.all(
        [...wanted].map(async (resource) => {
          const response = await fetch(
            `/api/admin/resources/${resource}?limit=100`,
            { cache: "no-store" },
          );
          if (!response.ok) throw new Error(await responseError(response));
          const result = (await response.json()) as { data: Row[] };
          return [resource, result.data] as const;
        }),
      );
      const values = Object.fromEntries(entries) as Record<string, Row[]>;
      setRows(values[kind] ?? []);
      setOptions({
        playlists: (
          values.playlists ?? (kind === "playlists" ? values[kind] : [])
        ).map(({ id, name, status }) => ({ id, name, status })),
        channels: (
          values.channels ?? (kind === "channels" ? values[kind] : [])
        ).map(({ id, name }) => ({ id, name })),
        contents: (
          values.contents ?? (kind === "contents" ? values[kind] : [])
        ).map(({ id, name, status }) => ({ id, name, status })),
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao carregar dados",
      );
    } finally {
      setLoading(false);
    }
  }, [enabled, kind]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filtered = useMemo(
    () =>
      rows.filter((row) =>
        row.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, rows],
  );

  function beginCreate() {
    setEditing(null);
    setContentType("url");
    setOpen(true);
  }
  function beginEdit(row: Row) {
    setEditing(row);
    setContentType(row.type ?? "url");
    setOpen(true);
  }

  async function pairDevice(row: Row) {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/devices/${row.id}/pair`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(await responseError(response));
      const result = (await response.json()) as {
        code: string;
        expiresAt: string;
      };
      setPairing({ ...result, deviceName: row.name });
      toast.success("Novo código de pareamento gerado");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao gerar código",
      );
    } finally {
      setBusy(false);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      const name = String(form.get("name") ?? "").trim();
      let payload: Record<string, unknown>;
      if (kind === "contents") {
        let blobPath = editing?.blobPath ?? null;
        const file = form.get("file");
        if (file instanceof File && file.size > 0) {
          const blob = await upload(file.name, file, {
            access: "public",
            handleUploadUrl: "/api/upload",
          });
          blobPath = blob.url;
        }
        payload = {
          name,
          type: contentType,
          status: String(form.get("status")),
          sourceUrl:
            contentType === "url" ? String(form.get("sourceUrl") ?? "") : null,
          html:
            contentType === "html" ? String(form.get("html") ?? "") : undefined,
          blobPath: ["image", "video"].includes(contentType) ? blobPath : null,
          defaultDurationSeconds: Number(form.get("duration") ?? 10),
        };
      } else if (kind === "devices") {
        payload = {
          name,
          slug: String(form.get("slug")),
          location: String(form.get("location") ?? "") || null,
          description: String(form.get("description") ?? "") || null,
          status: String(form.get("status")),
          orientation: String(form.get("orientation")),
          channelId:
            String(form.get("channelId") ?? "none") === "none"
              ? null
              : String(form.get("channelId")),
        };
      } else if (kind === "channels") {
        payload = {
          name,
          description: String(form.get("description") ?? "") || null,
          activePlaylistId:
            String(form.get("activePlaylistId") ?? "none") === "none"
              ? null
              : String(form.get("activePlaylistId")),
          fallbackPlaylistId:
            String(form.get("fallbackPlaylistId") ?? "none") === "none"
              ? null
              : String(form.get("fallbackPlaylistId")),
        };
      } else {
        payload = {
          name,
          description: String(form.get("description") ?? "") || null,
          status: editing?.status ?? "draft",
        };
      }
      const response = await fetch(
        `/api/admin/resources/${kind}${editing ? `/${editing.id}` : ""}`,
        {
          method: editing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw new Error(await responseError(response));
      const saved = (await response.json()) as Row;
      setOpen(false);
      setEditing(null);
      await load();
      toast.success(`${text.singular} ${editing ? "atualizado" : "criado"}`);
      if (kind === "devices" && !editing) await pairDevice(saved);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível salvar",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: Row) {
    if (
      !window.confirm(`Excluir “${row.name}”? Esta ação não pode ser desfeita.`)
    )
      return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/resources/${kind}/${row.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await responseError(response));
      await load();
      toast.success("Registro removido");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível excluir",
      );
    } finally {
      setBusy(false);
    }
  }

  async function setContentStatus(row: Row, status: "active" | "archived") {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/resources/contents/${row.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      await load();
      toast.success(
        status === "active" ? "Conteúdo ativado" : "Conteúdo arquivado",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao alterar status",
      );
    } finally {
      setBusy(false);
    }
  }

  async function openPlaylist(row: Row) {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/playlists/${row.id}/items`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(await responseError(response));
      const result = (await response.json()) as Array<{
        contentId: string;
        durationSeconds: number | null;
      }>;
      setPlaylistItems(
        result.map((item) => ({
          contentId: item.contentId,
          durationSeconds: item.durationSeconds ?? 10,
        })),
      );
      setPlaylistEditor(row);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao abrir playlist",
      );
    } finally {
      setBusy(false);
    }
  }

  function togglePlaylistContent(contentId: string) {
    setPlaylistItems((current) =>
      current.some((item) => item.contentId === contentId)
        ? current.filter((item) => item.contentId !== contentId)
        : [...current, { contentId, durationSeconds: 10 }],
    );
  }

  async function savePlaylistItems(publish: boolean) {
    if (!playlistEditor) return;
    setBusy(true);
    try {
      const itemsResponse = await fetch(
        `/api/admin/playlists/${playlistEditor.id}/items`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            items: playlistItems.map((item) => ({
              ...item,
              transitionType: "fade",
              enabled: true,
            })),
          }),
        },
      );
      if (!itemsResponse.ok)
        throw new Error(await responseError(itemsResponse));
      if (publish) {
        const response = await fetch(
          `/api/admin/playlists/${playlistEditor.id}/publish`,
          { method: "POST" },
        );
        if (!response.ok) throw new Error(await responseError(response));
      }
      setPlaylistEditor(null);
      await load();
      toast.success(
        publish ? "Playlist publicada" : "Itens salvos como rascunho",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao salvar playlist",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title={text.title}
        description={text.description}
        action={
          <Button onClick={beginCreate} disabled={!enabled}>
            <Plus /> Novo {text.singular}
          </Button>
        }
      />
      {!enabled && (
        <Card className="mb-4 p-6 text-sm text-muted-foreground">
          Configure o banco de dados para começar. Nenhum dado de demonstração é
          exibido.
        </Card>
      )}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome..."
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className={loading ? "animate-spin" : ""} /> Atualizar
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Detalhes</TableHead>
              <TableHead className="hidden sm:table-cell">Atualizado</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => {
              const status = rowStatus(kind, row);
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">
                    {row.type ?? text.singular}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        ["active", "published", "configured"].includes(status)
                          ? "default"
                          : "secondary"
                      }
                    >
                      {statusLabel[status] ?? status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden max-w-xs truncate text-muted-foreground md:table-cell">
                    {rowDetail(kind, row, options) || "—"}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">
                    {formatDate(row.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={busy}>
                          <MoreHorizontal />
                          <span className="sr-only">Ações</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => beginEdit(row)}>
                          <Pencil /> Editar
                        </DropdownMenuItem>
                        {kind === "devices" && (
                          <DropdownMenuItem
                            onClick={() => void pairDevice(row)}
                          >
                            <KeyRound /> Gerar novo código
                          </DropdownMenuItem>
                        )}
                        {kind === "contents" && status !== "active" && (
                          <DropdownMenuItem
                            onClick={() => void setContentStatus(row, "active")}
                          >
                            <CheckCircle2 /> Ativar
                          </DropdownMenuItem>
                        )}
                        {kind === "contents" && status === "active" && (
                          <DropdownMenuItem
                            onClick={() =>
                              void setContentStatus(row, "archived")
                            }
                          >
                            Arquivar
                          </DropdownMenuItem>
                        )}
                        {kind === "playlists" && (
                          <DropdownMenuItem
                            onClick={() => void openPlaylist(row)}
                          >
                            <Send /> Itens e publicação
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => void remove(row)}
                        >
                          <Trash2 /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && !filtered.length && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-28 text-center text-muted-foreground"
                >
                  Nenhum registro. Use “Novo {text.singular}” para começar.
                </TableCell>
              </TableRow>
            )}
            {loading && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-28 text-center text-muted-foreground"
                >
                  Carregando dados reais…
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={save}>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar" : "Novo"} {text.singular}
              </DialogTitle>
              <DialogDescription>
                Os dados são persistidos no banco imediatamente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-5">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editing?.name}
                  minLength={2}
                  maxLength={120}
                  required
                />
              </div>
              {kind === "contents" && (
                <>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      name="type"
                      value={contentType}
                      onValueChange={setContentType}
                      disabled={Boolean(editing)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="url">URL HTTPS</SelectItem>
                        <SelectItem value="image">Imagem</SelectItem>
                        <SelectItem value="video">Vídeo</SelectItem>
                        <SelectItem value="html">HTML seguro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {contentType === "url" && (
                    <div className="space-y-2">
                      <Label htmlFor="sourceUrl">URL HTTPS</Label>
                      <Input
                        id="sourceUrl"
                        name="sourceUrl"
                        type="url"
                        defaultValue={editing?.sourceUrl ?? ""}
                        required
                      />
                    </div>
                  )}
                  {contentType === "html" && (
                    <div className="space-y-2">
                      <Label htmlFor="html">HTML</Label>
                      <Textarea
                        id="html"
                        name="html"
                        defaultValue={editing?.htmlSafe ?? ""}
                        className="min-h-32 font-mono"
                        required
                      />
                    </div>
                  )}
                  {["image", "video"].includes(contentType) && (
                    <div className="space-y-2">
                      <Label htmlFor="file">
                        Arquivo{" "}
                        {editing?.blobPath
                          ? "(opcional para manter o atual)"
                          : ""}
                      </Label>
                      <Input
                        id="file"
                        name="file"
                        type="file"
                        accept={
                          contentType === "image"
                            ? "image/jpeg,image/png,image/webp"
                            : "video/mp4,video/webm"
                        }
                        required={!editing?.blobPath}
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        name="status"
                        defaultValue={editing?.status ?? "active"}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="draft">Rascunho</SelectItem>
                          <SelectItem value="archived">Arquivado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duração (segundos)</Label>
                      <Input
                        id="duration"
                        name="duration"
                        type="number"
                        min={3}
                        max={86400}
                        defaultValue={editing?.defaultDurationSeconds ?? 10}
                        required
                      />
                    </div>
                  </div>
                </>
              )}
              {kind === "playlists" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={editing?.description ?? ""}
                      maxLength={500}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Após salvar, abra “Itens e publicação” no menu da playlist
                    para escolher os conteúdos e ativá-la.
                  </p>
                </>
              )}
              {kind === "channels" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={editing?.description ?? ""}
                      maxLength={500}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Playlist ativa</Label>
                    <Select
                      name="activePlaylistId"
                      defaultValue={editing?.activePlaylistId ?? "none"}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {options.playlists
                          .filter((item) => item.status === "published")
                          .map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Playlist de contingência</Label>
                    <Select
                      name="fallbackPlaylistId"
                      defaultValue={editing?.fallbackPlaylistId ?? "none"}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {options.playlists
                          .filter((item) => item.status === "published")
                          .map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {kind === "devices" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="slug">Identificador</Label>
                      <Input
                        id="slug"
                        name="slug"
                        defaultValue={editing?.slug ?? ""}
                        pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                        placeholder="tv-recepcao"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Local</Label>
                      <Input
                        id="location"
                        name="location"
                        defaultValue={editing?.location ?? ""}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={editing?.description ?? ""}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        name="status"
                        defaultValue={editing?.status ?? "pending"}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="blocked">Bloqueado</SelectItem>
                          <SelectItem value="archived">Arquivado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Orientação</Label>
                      <Select
                        name="orientation"
                        defaultValue={editing?.orientation ?? "auto"}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Automática</SelectItem>
                          <SelectItem value="landscape">Horizontal</SelectItem>
                          <SelectItem value="portrait">Vertical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Canal</Label>
                    <Select
                      name="channelId"
                      defaultValue={editing?.channelId ?? "none"}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {options.channels.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(pairing)}
        onOpenChange={(value) => {
          if (!value) setPairing(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ative a tela {pairing?.deviceName}</DialogTitle>
            <DialogDescription>
              Faça isto na própria tela que vai exibir o conteúdo. O código vale
              uma única vez e expira em 10 minutos.
            </DialogDescription>
          </DialogHeader>

          <ol className="space-y-3 text-sm">
            <li>
              <p className="mb-1.5">
                <span className="font-medium">1.</span> Abra este endereço no
                navegador da tela:
              </p>
              <div className="flex items-center gap-2">
                {/* Quebra em vez de cortar: o endereço precisa ser legível
                    por inteiro para quem vai digitar na outra tela. */}
                <code className="min-w-0 flex-1 rounded-lg border bg-muted/40 px-3 py-2 font-mono text-xs break-all">
                  {playerUrl}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard
                      .writeText(playerUrl)
                      .then(() => toast.success("Endereço copiado"))
                      .catch(() => toast.error("Não foi possível copiar"));
                  }}
                >
                  Copiar
                </Button>
              </div>
            </li>
            <li>
              <p className="mb-1.5">
                <span className="font-medium">2.</span> Digite este código lá:
              </p>
              {/*
                O espaçamento entre letras também é aplicado depois do último
                dígito. O padding à esquerda compensa essa sobra para o número
                ficar realmente centralizado, e o tamanho acompanha a largura
                disponível para não vazar do container em telas estreitas.
              */}
              <div
                data-testid="pairing-code"
                className="overflow-hidden rounded-xl border bg-muted/40 px-3 py-6 pl-[calc(0.75rem+0.3em)] text-center font-mono text-3xl font-bold tracking-[0.3em] tabular-nums sm:text-4xl"
              >
                {pairing?.code}
              </div>
            </li>
          </ol>

          <p className="text-center text-xs text-muted-foreground">
            Expira em {formatDate(pairing?.expiresAt)}. Depois de ativada, a
            tela se conecta sozinha e não pede código de novo.
          </p>
          <DialogFooter>
            <Button onClick={() => setPairing(null)}>Concluído</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(playlistEditor)}
        onOpenChange={(value) => {
          if (!value) setPlaylistEditor(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Itens de {playlistEditor?.name}</DialogTitle>
            <DialogDescription>
              Selecione conteúdos ativos. Salvar mantém rascunho; publicar gera
              a versão usada pelos dispositivos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-3">
            {options.contents
              .filter((item) => item.status === "active")
              .map((content) => {
                const selected = playlistItems.some(
                  (item) => item.contentId === content.id,
                );
                return (
                  <label
                    key={content.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => togglePlaylistContent(content.id)}
                      className="size-4"
                    />
                    <span className="flex-1 text-sm font-medium">
                      {content.name}
                    </span>
                    {selected && (
                      <Input
                        className="w-24"
                        type="number"
                        min={3}
                        max={86400}
                        value={
                          playlistItems.find(
                            (item) => item.contentId === content.id,
                          )?.durationSeconds ?? 10
                        }
                        onChange={(event) =>
                          setPlaylistItems((current) =>
                            current.map((item) =>
                              item.contentId === content.id
                                ? {
                                    ...item,
                                    durationSeconds: Number(event.target.value),
                                  }
                                : item,
                            ),
                          )
                        }
                        aria-label={`Duração de ${content.name}`}
                      />
                    )}
                  </label>
                );
              })}
            {!options.contents.some((item) => item.status === "active") && (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Ative pelo menos um conteúdo antes de montar a playlist.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => void savePlaylistItems(false)}
              disabled={busy}
            >
              Salvar rascunho
            </Button>
            <Button
              onClick={() => void savePlaylistItems(true)}
              disabled={busy || !playlistItems.length}
            >
              <Send /> Publicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
