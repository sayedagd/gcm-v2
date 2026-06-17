import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { AppProviders } from "@/providers/AppProviders";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { APP_DEFAULT_DESCRIPTION, APP_NAME, APP_TITLE_TEMPLATE } from "@/lib/metadata";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DEFAULT_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${cairo.variable} h-full w-full antialiased font-sans`}
    >
      <body className="min-h-full flex w-full flex-col overflow-x-clip" suppressHydrationWarning>
        <ErrorBoundary moduleName="RootLayout">
          <AppProviders>{children}</AppProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
}
