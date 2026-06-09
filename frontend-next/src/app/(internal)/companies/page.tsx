import { Suspense } from "react";
import CompaniesClient from "./CompaniesClient";
import { LoadingState } from "@/components/common/FetchBoundaryState";

export default function CompaniesPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading companies..." />}>
      <CompaniesClient />
    </Suspense>
  );
}
