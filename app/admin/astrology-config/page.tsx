import { notFound, redirect } from "next/navigation";
import AstrologyConfigForm from "@/components/admin/astrology-config-form";
import { getAuthenticatedClerkUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AstrologyConfigPage() {
  const identity = await getAuthenticatedClerkUser();
  if (!identity) redirect("/sign-in");
  if (!identity.isSuperAdmin) notFound();

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">Administrator</p>
        <h1 className="text-2xl font-semibold">Astrology calculation settings</h1>
        <p className="text-sm text-muted-foreground">Configure Avastha, Chara/Yogini Dasha, and Nadi progression rules.</p>
      </header>
      <AstrologyConfigForm />
    </main>
  );
}
