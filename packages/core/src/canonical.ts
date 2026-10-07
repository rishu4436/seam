import type { JsonArray, JsonObject, JsonValue } from "./json.js";

/** Canonical JSON for Manifest digest: object keys sorted, array order preserved. */
export function canonicalize(value: JsonValue): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${(value as JsonArray).map((v) => canonicalize(v)).join(",")}]`;
  }
  const obj = value as JsonObject;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k]!)}`).join(",")}}`;
}
