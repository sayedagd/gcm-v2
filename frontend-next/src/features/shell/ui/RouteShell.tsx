import dynamic from "next/dynamic";
import { QUICK_LINKS } from "@/features/navigation/model/quickLinks";

type RouteShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

const QuickLinks = dynamic(
  () => import("@/features/navigation/ui/QuickLinks").then((module) => module.QuickLinks),
  {
    loading: () => <div className="hidden text-sm text-muted md:block">Loading navigation...</div>,
  },
);

export function RouteShell({ title, subtitle, children }: RouteShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-slate-200 bg-surface">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-sm font-semibold text-primary">GCM Migration</p>
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="text-sm text-muted">{subtitle}</p>
          </div>
          <QuickLinks links={QUICK_LINKS} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl p-4 md:p-6">{children}</main>
    </div>
  );
}
