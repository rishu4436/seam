export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

export function isJsonPrimitive(value: unknown): value is JsonPrimitive {
  if (value === null) return true;
  if (typeof value === "string") return true;
  if (typeof value === "boolean") return true;
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  return false;
}

export function toJsonValue(value: unknown, seen: WeakSet<object> = new WeakSet()): JsonValue {
  if (isJsonPrimitive(value)) return value;
  if (typeof value === "undefined") {
    throw new Error("JSON_REJECT_UNDEFINED");
  }
  if (typeof value === "bigint") throw new Error("JSON_REJECT_BIGINT");
  if (typeof value === "function") throw new Error("JSON_REJECT_FUNCTION");
  if (typeof value === "symbol") throw new Error("JSON_REJECT_SYMBOL");
  if (value instanceof Date) throw new Error("JSON_REJECT_DATE");
  if (value instanceof Map) throw new Error("JSON_REJECT_MAP");
  if (value instanceof Set) throw new Error("JSON_REJECT_SET");
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new Error("JSON_REJECT_CYCLE");
    seen.add(value);
    return value.map((item) => toJsonValue(item, seen));
  }
  if (isPlainObject(value)) {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      throw new Error("JSON_REJECT_CLASS_INSTANCE");
    }
    if (seen.has(value)) throw new Error("JSON_REJECT_CYCLE");
    seen.add(value);
    const out: JsonObject = {};
    for (const key of Object.keys(value)) {
      const desc = Object.getOwnPropertyDescriptor(value, key);
      if (!desc || typeof desc.get === "function" || typeof desc.set === "function") {
        throw new Error("JSON_REJECT_ACCESSOR");
      }
      out[key] = toJsonValue(value[key], seen);
    }
    return out;
  }
  throw new Error("JSON_REJECT_NON_JSON");
}

export function cloneJson<T extends JsonValue>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
