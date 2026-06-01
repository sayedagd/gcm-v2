import { RouteShell } from "@/features/shell/ui/RouteShell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function InternalLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteShell title="Internal Workspace" subtitle="Admin, operations, logistics, and reports routes">
      {children}
    </RouteShell>
  );
}
