import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { Providers } from "@/components/shell/Providers";
import { readSession } from "@/server/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession().catch(() => null);
  if (!session) redirect("/");
  return (
    <Providers>
      <AppShell>{children}</AppShell>
    </Providers>
  );
}
