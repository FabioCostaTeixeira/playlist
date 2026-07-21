import { ResourceWorkspace } from "@/components/app/resource-workspace";
import { isDatabaseConfigured } from "@/db";

export default function ContentsPage() { return <ResourceWorkspace kind="contents" demo={!isDatabaseConfigured()} initialRows={[{ id: "c1", name: "Campanha Inverno", type: "image", status: "active", detail: "1920×1080 · 1,4 MB", updated: "há 12 min" }, { id: "c2", name: "Previsão do tempo", type: "url", status: "active", detail: "https://painel.exemplo.com", updated: "ontem" }, { id: "c3", name: "Boas-vindas", type: "video", status: "draft", detail: "00:24 · 18 MB", updated: "há 3 dias" }]} />; }
