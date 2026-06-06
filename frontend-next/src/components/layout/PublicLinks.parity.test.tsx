// @vitest-environment jsdom

import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("@/context", () => ({
  useStore: () => ({
    saasConfig: {
      language: "en",
      appNameAr: "GCM",
      appNameEn: "GCM",
      appSloganAr: "",
      appSloganEn: "",
      logoUrl: "",
      logoDarkUrl: "",
      landingPage: {
        portalBtnTextAr: "",
        portalBtnTextEn: "Login",
        portalIconType: "user",
        footerAboutAr: "",
        footerAboutEn: "",
        socialLinks: [],
      },
    },
    updateSaaS: vi.fn(),
    darkMode: false,
    setDarkMode: vi.fn(),
  }),
}));

describe("public route deep-link parity", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    pushMock.mockReset();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test("navbar routes section links through /landing hash when off landing page", () => {
    window.history.replaceState(null, "", "/store");

    act(() => {
      root.render(<PublicNavbar isScrolled={false} setIsLoginModalOpen={() => undefined} />);
    });

    const aboutButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "About",
    );
    expect(aboutButton).toBeTruthy();

    act(() => {
      aboutButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(pushMock).toHaveBeenCalledWith("/landing#about");
  });

  test("navbar smoke: all links resolve to canonical routes", () => {
    window.history.replaceState(null, "", "/store");

    act(() => {
      root.render(<PublicNavbar isScrolled={false} setIsLoginModalOpen={() => undefined} />);
    });

    const expectations: Array<{ label: string; target: string }> = [
      { label: "About", target: "/landing#about" },
      { label: "Services", target: "/landing#services" },
      { label: "Equipment Store", target: "/store" },
      { label: "Fleet", target: "/landing#fleet" },
      { label: "Contact", target: "/landing#contact" },
    ];

    for (const expectation of expectations) {
      const linkButton = Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent?.trim() === expectation.label,
      );
      expect(linkButton, `Missing navbar button: ${expectation.label}`).toBeTruthy();

      act(() => {
        linkButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(pushMock).toHaveBeenCalledWith(expectation.target);
    }
  });

  test("footer quick links target canonical /landing section anchors", () => {
    act(() => {
      root.render(<PublicFooter />);
    });

    const servicesLink = Array.from(container.querySelectorAll("a")).find((link) => link.textContent === "Our Services");
    const contactLink = Array.from(container.querySelectorAll("a")).find((link) => link.textContent === "Contact");

    expect(servicesLink?.getAttribute("href")).toBe("/landing#services");
    expect(contactLink?.getAttribute("href")).toBe("/landing#contact");
  });
});
