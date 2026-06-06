import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventory Management",
  description: "Track containers, tanks, sizes, and scale-linked inventory operations in real time.",
};

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
