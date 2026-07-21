import { ResourceWorkspace } from "@/components/app/resource-workspace";
import { isDatabaseConfigured } from "@/db";

export default function ContentsPage() { return <ResourceWorkspace kind="contents" enabled={isDatabaseConfigured()} />; }
