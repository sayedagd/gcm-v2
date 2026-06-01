"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import type { QuickLink } from "@/features/navigation/model/quickLinks";

export function QuickLinks({ links }: { links: QuickLink[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const normalized = deferredQuery.trim().toLowerCase();
  const visibleLinks = normalized
    ? links.filter((item) => item.label.toLowerCase().includes(normalized))
    : links;

  return (
    <div className="hidden items-center gap-3 md:flex">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search route"
        className="w-40 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
      />
      <nav className="flex gap-2 text-sm">
        {visibleLinks.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-md px-2 py-1 hover:bg-slate-100">
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
