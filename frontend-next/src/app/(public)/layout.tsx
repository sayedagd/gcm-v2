import { RouteShell } from "@/features/shell/ui/RouteShell";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteShell title="Public Portal" subtitle="Public pages and pre-auth flows">
      {children}
    </RouteShell>
  );
}
