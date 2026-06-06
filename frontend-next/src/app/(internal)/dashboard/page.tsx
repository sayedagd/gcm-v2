import { cookies } from "next/headers";
import { InternalDashboardClient } from "@/components/dashboard/InternalDashboardClient";
import { fetchApiJson } from "@/lib/serverFetch";

const FALLBACK_HERO =
  "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?auto=format&fit=crop&w=1600&q=80";

const getInitialHeroImage = async () => {
  try {
    const cookieHeader = (await cookies()).toString();
    const requestOptions = cookieHeader
      ? { strategy: "dynamic" as const, headers: { cookie: cookieHeader, "x-gcm-auth": "VALID" } }
      : { strategy: "dynamic" as const };

    const config = await fetchApiJson<{
      landing_page?: { heroBgUrl?: string } | string;
      landingPage?: { heroBgUrl?: string };
    }>("/api/v1/config", requestOptions);

    if (!config) {
      return FALLBACK_HERO;
    }

    if (config.landingPage?.heroBgUrl) {
      return config.landingPage.heroBgUrl;
    }

    if (typeof config.landing_page === "string") {
      const parsed = JSON.parse(config.landing_page) as { heroBgUrl?: string };
      return parsed.heroBgUrl || FALLBACK_HERO;
    }

    if (config.landing_page?.heroBgUrl) {
      return config.landing_page.heroBgUrl;
    }
  } catch {
    return FALLBACK_HERO;
  }

  return FALLBACK_HERO;
};

export default async function InternalDashboardPage() {
  const initialHeroImage = await getInitialHeroImage();
  return <InternalDashboardClient initialHeroImage={initialHeroImage} />;
}
