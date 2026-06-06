import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fleet Management",
  description: "Monitor vehicles, availability, compliance, and fleet performance across active operations.",
};

export default function FleetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
