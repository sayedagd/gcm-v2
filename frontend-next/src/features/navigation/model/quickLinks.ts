export type QuickLink = {
  href: string;
  label: string;
};

export const QUICK_LINKS: QuickLink[] = [
  { href: "/login", label: "Login" },
  { href: "/logout", label: "Logout" },
  { href: "/client/dashboard", label: "Client" },
  { href: "/subcontractor/dashboard", label: "Subcontractor" },
  { href: "/driver", label: "Driver" },
  { href: "/dashboard", label: "Internal" },
];
