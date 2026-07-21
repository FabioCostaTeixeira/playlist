import { ResourceWorkspace } from "@/components/app/resource-workspace";
import { isDatabaseConfigured } from "@/db";

export default function PlaylistsPage() { return <ResourceWorkspace kind="playlists" demo={!isDatabaseConfigured()} initialRows={[{ id: "p1", name: "Recepção principal", status: "published", detail: "8 itens · 04:30", updated: "há 8 min" }, { id: "p2", name: "Campanha Julho", status: "draft", detail: "4 itens · 02:10", updated: "há 1 h" }, { id: "p3", name: "Fallback institucional", status: "published", detail: "3 itens · 01:20", updated: "há 6 dias" }]} />; }
