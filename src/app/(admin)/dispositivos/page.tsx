import { ResourceWorkspace } from "@/components/app/resource-workspace";
import { isDatabaseConfigured } from "@/db";

export default function DevicesPage() { return <ResourceWorkspace kind="devices" demo={!isDatabaseConfigured()} initialRows={[{ id: "d1", name: "TV Recepção 01", status: "online", detail: "Recepção · 1920×1080", updated: "há 2 min" }, { id: "d2", name: "TV Loja Paulista", status: "online", detail: "Loja SP · 1080×1920", updated: "há 4 min" }, { id: "d3", name: "TV Refeitório", status: "offline", detail: "Sem contato há 47 min", updated: "há 47 min" }, { id: "d4", name: "Nova tela", status: "pending", detail: "Aguardando pareamento", updated: "hoje" }]} />; }
