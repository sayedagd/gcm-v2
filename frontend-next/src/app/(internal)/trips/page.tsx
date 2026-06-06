import { Suspense } from "react";
import TripsClient from "./TripsClient";

export default function TripsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading trips...</div>}>
      <TripsClient />
    </Suspense>
  );
}
