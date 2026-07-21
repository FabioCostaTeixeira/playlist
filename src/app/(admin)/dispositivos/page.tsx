import { ResourceWorkspace } from "@/components/app/resource-workspace";
import { isDatabaseConfigured } from "@/db";

export default function DevicesPage() { return <ResourceWorkspace kind="devices" enabled={isDatabaseConfigured()} />; }
