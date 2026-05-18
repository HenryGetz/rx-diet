import Ajv2020 from "ajv/dist/2020.js";
import type { ErrorObject } from "ajv";
import schema from "./schema.json" with { type: "json" };

export const SCHEMA_VERSION = "5" as const;
export const GRAMMAR_VERSION = 1 as const;

export interface ValidationResult {
  valid: boolean;
  errors?: Array<{ path: string; message: string }>;
}

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
});

const validate = ajv.compile(schema);

export function validateResume(data: unknown): ValidationResult {
  const valid = validate(data) as boolean;

  if (!valid && validate.errors) {
    return {
      valid: false,
      errors: validate.errors.map(mapAjvError),
    };
  }

  return { valid: true };
}

function mapAjvError(err: ErrorObject): { path: string; message: string } {
  return {
    path: err.instancePath || "/",
    message: err.message ?? "Unknown validation error",
  };
}

let cachedValidator: ReturnType<typeof ajv.compile> | null = null;

export function getValidator() {
  if (!cachedValidator) {
    cachedValidator = ajv.compile(schema);
  }
  return cachedValidator;
}

export default ajv;
