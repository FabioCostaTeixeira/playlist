import { ResourceWorkspace } from "@/components/app/resource-workspace";
import { isDatabaseConfigured } from "@/db";

export default function PlaylistsPage() { return <ResourceWorkspace kind="playlists" enabled={isDatabaseConfigured()} />; }
