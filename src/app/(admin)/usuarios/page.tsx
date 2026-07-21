import { Plus, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const users = [{ name: "Ana Martins", email: "ana@nexus.local", role: "Administrador", status: "Ativo" }, { name: "Bruno Lima", email: "bruno@nexus.local", role: "Editor", status: "Ativo" }, { name: "Carla Souza", email: "carla@nexus.local", role: "Operador", status: "Ativo" }, { name: "Diego Alves", email: "diego@nexus.local", role: "Visualizador", status: "Bloqueado" }];
export default function UsersPage() { return <><PageHeader eyebrow="Acesso" title="Usuários e permissões" description="Papéis são aplicados no servidor e cada vínculo pertence a uma organização." action={<Button><Plus /> Adicionar usuário</Button>} /><Card className="overflow-hidden"><Table><TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>Papel</TableHead><TableHead>Status</TableHead><TableHead>Proteção</TableHead></TableRow></TableHeader><TableBody>{users.map((item) => <TableRow key={item.email}><TableCell><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.email}</p></TableCell><TableCell>{item.role}</TableCell><TableCell><Badge variant={item.status === "Ativo" ? "default" : "secondary"}>{item.status}</Badge></TableCell><TableCell><span className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-primary" /> RBAC no servidor</span></TableCell></TableRow>)}</TableBody></Table></Card></>; }
