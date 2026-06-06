import type { NextRequest } from "next/server";
import { proxy } from "./src/proxy";

// Compatibility shim for tooling/runtime paths that still resolve middleware.ts.
export function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
