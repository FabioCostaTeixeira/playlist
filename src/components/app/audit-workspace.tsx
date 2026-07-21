"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Event = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorName: string | null;
  actorEmail: string | null;
  createdAt: string;
};

export function AuditWorkspace() {
  const [events, setEvents] = useState<Event[]>([]);
  const [query, setQuery] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/admin/audit", { cache: "no-store" });
    if (!response.ok) return toast.error("Falha ao carregar auditoria");
    setEvents((await response.json()) as Event[]);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const filtered = useMemo(
    () =>
      events.filter((event) =>
        `${event.action} ${event.entityType} ${event.entityId} ${event.actorName} ${event.actorEmail}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [events, query],
  );
  function exportCsv() {
    const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = [
      ["ação", "entidade", "id", "ator", "email", "data"],
      ...filtered.map((event) => [
        event.action,
        event.entityType,
        event.entityId,
        event.actorName ?? "",
        event.actorEmail ?? "",
        new Date(event.createdAt).toISOString(),
      ]),
    ]
      .map((row) => row.map(quote).join(","))
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    link.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
  return (
    <>
      <PageHeader
        eyebrow="Governança"
        title="Auditoria"
        description="Mudanças administrativas relevantes, sem segredos nos registros."
        action={
          <Button variant="outline" onClick={exportCsv}>
            <Download /> Exportar CSV
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <div className="border-b p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar ator, ação ou entidade..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ação</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>Ator</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  <Badge variant="outline">{event.action}</Badge>
                </TableCell>
                <TableCell className="font-medium">
                  {event.entityType}
                </TableCell>
                <TableCell>
                  <p>{event.actorName ?? "Sistema"}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.actorEmail}
                  </p>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(event.createdAt))}
                </TableCell>
                <TableCell className="max-w-40 truncate font-mono text-xs text-muted-foreground">
                  {event.entityId}
                </TableCell>
              </TableRow>
            ))}
            {!filtered.length && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-28 text-center text-muted-foreground"
                >
                  Nenhum evento encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
