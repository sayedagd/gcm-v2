import { Suspense } from "react";
import CompaniesClient from "./CompaniesClient";

export default function CompaniesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading companies...</div>}>
      <CompaniesClient />
    </Suspense>
  );
}
