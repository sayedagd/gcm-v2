import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Companies Management",
  description: "Manage client organizations, commercial records, and account-level operational identity.",
};

export default function CompaniesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
