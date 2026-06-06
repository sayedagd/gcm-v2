import { MainLayout } from "@/components/layout/MainLayout";

export const dynamic = "force-dynamic";

export default function InternalLayout({ children }: { children: React.ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}
