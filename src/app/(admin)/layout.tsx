import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { getActor } from "@/server/access";
import { isDatabaseConfigured } from "@/db";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const configured = isDatabaseConfigured();
  const actor = configured ? await getActor() : null;
  if (configured && !actor) redirect("/login");
  return <AppShell organization={actor?.organizationName} demo={!configured}>{children}</AppShell>;
}
