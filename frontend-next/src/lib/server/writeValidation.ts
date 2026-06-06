export type WriteEntity =
  | "companies"
  | "projects"
  | "trips"
  | "services"
  | "vehicles"
  | "drivers"
  | "suppliers"
  | "facilities";

export type ValidationResult =
  | { ok: true }
  | { ok: false; message: string; code: string };

type EntityValidationSchema = {
  anyOfNonEmptyString: string[];
};

const INVALID_PAYLOAD = {
  ok: false as const,
  message: "Payload must be a non-empty object.",
  code: "INVALID_PAYLOAD",
};

export const validateUpsertPayload = (payload: unknown): ValidationResult => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return INVALID_PAYLOAD;
  }

  if (Object.keys(payload as Record<string, unknown>).length === 0) {
    return INVALID_PAYLOAD;
  }

  return { ok: true };
};

const entitySchemas: Record<WriteEntity, EntityValidationSchema> = {
  companies: { anyOfNonEmptyString: ["company_id", "company_name", "id"] },
  projects: { anyOfNonEmptyString: ["project_id", "project_name", "id"] },
  trips: { anyOfNonEmptyString: ["trip_id", "project_id", "id"] },
  services: { anyOfNonEmptyString: ["service_id", "service_name", "id"] },
  vehicles: { anyOfNonEmptyString: ["vehicle_id", "plate_number", "id"] },
  drivers: { anyOfNonEmptyString: ["driver_id", "name", "id"] },
  suppliers: { anyOfNonEmptyString: ["supplier_id", "name", "id"] },
  facilities: { anyOfNonEmptyString: ["facility_id", "name", "id"] },
};

const hasNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const validateEntityUpsertPayload = (
  entity: WriteEntity,
  payload: unknown,
): ValidationResult => {
  const baseValidation = validateUpsertPayload(payload);
  if (!baseValidation.ok) {
    return baseValidation;
  }

  const schema = entitySchemas[entity];
  const payloadObject = payload as Record<string, unknown>;
  const isValid = schema.anyOfNonEmptyString.some((field) => hasNonEmptyString(payloadObject[field]));

  if (!isValid) {
    return {
      ok: false,
      message: `Payload for ${entity} must include at least one valid identity field (${schema.anyOfNonEmptyString.join(", ")}).`,
      code: `INVALID_${entity.toUpperCase()}_PAYLOAD`,
    };
  }

  return { ok: true };
};

export const validateDeleteId = (id: string | undefined): ValidationResult => {
  if (!id || typeof id !== "string" || id.trim().length === 0) {
    return {
      ok: false,
      message: "A valid resource id is required.",
      code: "INVALID_ID",
    };
  }

  return { ok: true };
};
