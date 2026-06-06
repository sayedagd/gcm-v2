import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Trips Management",
  description: "Create, assign, track, and audit trip operations across projects and service workflows.",
};

export default function TripsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
