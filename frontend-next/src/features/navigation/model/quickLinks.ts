export type QuickLink = {
  href: string;
  label: string;
};

export const QUICK_LINKS: QuickLink[] = [
  { href: "/landing", label: "Landing" },
  { href: "/login", label: "Login" },
  { href: "/logout", label: "Logout" },
  { href: "/client/dashboard", label: "Client" },
  { href: "/subcontractor/dashboard", label: "Subcontractor" },
  { href: "/driver", label: "Driver" },
  { href: "/db", label: "Internal" },
];
