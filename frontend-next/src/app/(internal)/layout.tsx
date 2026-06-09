import { MainLayout } from "@/components/layout/MainLayout";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function InternalLayout({ children }: { children: React.ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}
