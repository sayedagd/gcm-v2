import { describe, expect, test } from "vitest";
import {
  validateDeleteId,
  validateEntityUpsertPayload,
  validateUpsertPayload,
} from "@/lib/server/writeValidation";

describe("write validation", () => {
  test("rejects invalid upsert payloads", () => {
    expect(validateUpsertPayload(null).ok).toBe(false);
    expect(validateUpsertPayload([]).ok).toBe(false);
    expect(validateUpsertPayload({}).ok).toBe(false);
  });

  test("accepts non-empty object payload", () => {
    expect(validateUpsertPayload({ id: "1", name: "demo" }).ok).toBe(true);
  });

  test("accepts payload when entity identity fields exist", () => {
    expect(validateEntityUpsertPayload("companies", { company_name: "Alpha" }).ok).toBe(true);
    expect(validateEntityUpsertPayload("services", { service_id: "S-1" }).ok).toBe(true);
    expect(validateEntityUpsertPayload("vehicles", { plate_number: "ABC-123" }).ok).toBe(true);
  });

  test("rejects payload missing entity identity fields", () => {
    const result = validateEntityUpsertPayload("facilities", { location: "Zone A" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("INVALID_FACILITIES_PAYLOAD");
    }
  });

  test("validates delete id", () => {
    expect(validateDeleteId(undefined).ok).toBe(false);
    expect(validateDeleteId("").ok).toBe(false);
    expect(validateDeleteId("abc").ok).toBe(true);
  });
});
