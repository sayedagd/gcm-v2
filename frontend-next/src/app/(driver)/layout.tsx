import { RouteShell } from "@/features/shell/ui/RouteShell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteShell title="Driver Portal" subtitle="Driver dashboard and route map flows">
      {children}
    </RouteShell>
  );
}
