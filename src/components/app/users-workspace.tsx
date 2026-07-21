"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MoreHorizontal,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
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

type Member = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "operator" | "viewer";
  status: string;
  createdAt: string;
};
const roles = {
  admin: "Administrador",
  editor: "Editor",
  operator: "Operador",
  viewer: "Visualizador",
};

async function getError(response: Response) {
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

export function UsersWorkspace() {
  const [members, setMembers] = useState<Member[]>([]);
  const [editing, setEditing] = useState<Member | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    if (response.ok) setMembers((await response.json()) as Member[]);
    else toast.error(await getError(response));
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      const payload = editing
        ? { role: form.get("role"), status: form.get("status") }
        : {
            name: form.get("name"),
            email: form.get("email"),
            password: form.get("password"),
            role: form.get("role"),
          };
      const response = await fetch(
        editing ? `/api/admin/users/${editing.id}` : "/api/admin/users",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw new Error(await getError(response));
      setOpen(false);
      setEditing(null);
      await load();
      toast.success(
        editing ? "Usuário atualizado" : "Usuário criado e adicionado",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao salvar usuário",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(member: Member) {
    if (!window.confirm(`Remover ${member.name} desta organização?`)) return;
    const response = await fetch(`/api/admin/users/${member.id}`, {
      method: "DELETE",
    });
    if (!response.ok) return toast.error(await getError(response));
    await load();
    toast.success("Usuário removido da organização");
  }

  return (
    <>
      <PageHeader
        eyebrow="Acesso"
        title="Usuários e permissões"
        description="Crie usuários, altere papéis e bloqueie acessos."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus /> Adicionar usuário
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Proteção</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.email}</p>
                </TableCell>
                <TableCell>{roles[item.role]}</TableCell>
                <TableCell>
                  <Badge
                    variant={item.status === "active" ? "default" : "secondary"}
                  >
                    {item.status === "active" ? "Ativo" : "Bloqueado"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="size-4 text-primary" /> RBAC no
                    servidor
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal />
                        <span className="sr-only">Ações</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditing(item);
                          setOpen(true);
                        }}
                      >
                        <Pencil /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => void remove(item)}
                      >
                        <Trash2 /> Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {!members.length && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-28 text-center text-muted-foreground"
                >
                  Nenhum usuário encontrado.
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
        <DialogContent>
          <form onSubmit={save}>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar usuário" : "Adicionar usuário"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? "Altere o papel ou o status deste acesso."
                  : "Uma conta será criada com a senha inicial informada."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-5">
              {!editing && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input id="name" name="name" minLength={2} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" name="email" type="email" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha inicial</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      minLength={12}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Mínimo de 12 caracteres.
                    </p>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>Papel</Label>
                <Select name="role" defaultValue={editing?.role ?? "viewer"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roles).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editing && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select name="status" defaultValue={editing.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="blocked">Bloqueado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
    </>
  );
}
