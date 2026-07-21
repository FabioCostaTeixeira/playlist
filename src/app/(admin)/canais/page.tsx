import { ResourceWorkspace } from "@/components/app/resource-workspace";
import { isDatabaseConfigured } from "@/db";

export default function ChannelsPage() { return <ResourceWorkspace kind="channels" demo={!isDatabaseConfigured()} initialRows={[{ id: "ch1", name: "Recepção", status: "active", detail: "6 dispositivos · v24", updated: "há 8 min" }, { id: "ch2", name: "Lojas SP", status: "active", detail: "9 dispositivos · v18", updated: "ontem" }, { id: "ch3", name: "Corporativo", status: "draft", detail: "Sem dispositivos", updated: "há 4 dias" }]} />; }
