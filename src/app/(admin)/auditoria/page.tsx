import { Download, Search } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const events = [{ action: "publish", entity: "Playlist · Recepção principal", actor: "Ana Martins", at: "21/07/2026 10:42", id: "evt_01" }, { action: "update", entity: "Conteúdo · Campanha Julho", actor: "Bruno Lima", at: "21/07/2026 09:58", id: "evt_02" }, { action: "pairing_code_created", entity: "Dispositivo · TV Loja 03", actor: "Ana Martins", at: "21/07/2026 09:31", id: "evt_03" }, { action: "delete", entity: "Canal · Teste", actor: "Administrador", at: "20/07/2026 18:12", id: "evt_04" }];

export default function AuditPage() {
  return <><PageHeader eyebrow="Governança" title="Auditoria" description="Mudanças administrativas relevantes, sem segredos ou dados sensíveis nos registros." action={<Button variant="outline"><Download /> Exportar CSV</Button>} /><Card className="overflow-hidden"><div className="border-b p-4"><div className="relative max-w-sm"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar ator, ação ou entidade..." /></div></div><Table><TableHeader><TableRow><TableHead>Ação</TableHead><TableHead>Entidade</TableHead><TableHead>Ator</TableHead><TableHead>Data</TableHead><TableHead>ID</TableHead></TableRow></TableHeader><TableBody>{events.map((event) => <TableRow key={event.id}><TableCell><Badge variant="outline">{event.action}</Badge></TableCell><TableCell className="font-medium">{event.entity}</TableCell><TableCell>{event.actor}</TableCell><TableCell className="font-mono text-xs text-muted-foreground">{event.at}</TableCell><TableCell className="font-mono text-xs text-muted-foreground">{event.id}</TableCell></TableRow>)}</TableBody></Table></Card></>;
}
