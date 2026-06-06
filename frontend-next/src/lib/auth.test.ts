import { describe, expect, test } from "vitest";
import { getRequiredRoles, getRoleHome, isGcmRole } from "@/lib/auth";

describe("auth policy helpers", () => {
  test("isGcmRole validates known and unknown roles", () => {
    expect(isGcmRole("ADMIN")).toBe(true);
    expect(isGcmRole("CLIENT")).toBe(true);
    expect(isGcmRole("UNKNOWN_ROLE")).toBe(false);
    expect(isGcmRole(undefined)).toBe(false);
  });

  test("getRoleHome maps major role families", () => {
    expect(getRoleHome("CLIENT")).toBe("/client/dashboard");
    expect(getRoleHome("SUBCONTRACTOR")).toBe("/subcontractor/dashboard");
    expect(getRoleHome("DRIVER")).toBe("/driver");
    expect(getRoleHome("ACCOUNTANT")).toBe("/accountant-portal");
    expect(getRoleHome("REPORTS_MANAGER")).toBe("/reports-dashboard");
    expect(getRoleHome("ADMIN")).toBe("/dashboard");
  });

  test("getRequiredRoles resolves prefix policies", () => {
    expect(getRequiredRoles("/client/dashboard")).toContain("CLIENT");
    expect(getRequiredRoles("/driver/map")).toEqual(["DRIVER"]);
    expect(getRequiredRoles("/system-monitor")).toEqual(["ADMIN"]);
    expect(getRequiredRoles("/login")).toBeNull();
  });
});
