import { ResourceWorkspace } from "@/components/app/resource-workspace";
import { isDatabaseConfigured } from "@/db";

export default function ChannelsPage() { return <ResourceWorkspace kind="channels" enabled={isDatabaseConfigured()} />; }
