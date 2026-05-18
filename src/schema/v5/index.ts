import { validate as rxRulerValidate } from "rx-ruler";
import type { ValidationError } from "rx-ruler";

export const SCHEMA_VERSION = "5" as const;
export const GRAMMAR_VERSION = 1 as const;

export interface ValidationResult {
  valid: boolean;
  errors?: Array<{ path: string; message: string }>;
}

function mapRxRulerError(err: ValidationError): { path: string; message: string } {
  return {
    path: err.path || "/",
    message: err.message,
  };
}

export function validateResume(data: unknown): ValidationResult {
  const result = rxRulerValidate(data);
  if (result.ok) {
    return { valid: true };
  }
  return {
    valid: false,
    errors: result.errors.map(mapRxRulerError),
  };
}

export function validateResumeLenient(data: unknown): ValidationResult {
  const result = rxRulerValidate(data);
  if (result.ok) return { valid: true };

  // Lenient fallback for non-RR formats (JSON Resume, partial exports, etc.)
  // Only reject if the data is clearly not a resume at all.
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {
      valid: false,
      errors: [{ path: "/", message: "Input is not a valid JSON object" }],
    };
  }

  const obj = data as Record<string, unknown>;

  if (!obj.basics || typeof obj.basics !== "object") {
    return {
      valid: false,
      errors: [{ path: "basics", message: "Missing or invalid basics section" }],
    };
  }

  // Pass strict errors as warnings but don't block
  return { valid: true };
}
