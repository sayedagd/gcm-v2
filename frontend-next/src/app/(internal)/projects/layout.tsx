import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Projects Management",
  description: "Manage project lifecycle, service allocations, and operational planning across client sites.",
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
