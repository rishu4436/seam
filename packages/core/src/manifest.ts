import { cloneJson, isPlainObject, toJsonValue, type JsonObject } from "./json.js";
import { issue, type ValidationIssue } from "./issues.js";

export const SEAM_MANIFEST_VERSION = "1" as const;

export interface SeamActionV1 {
  id: string;
  capability: string;
  params: JsonObject;
}

export interface SeamManifestV1 {
  seam: typeof SEAM_MANIFEST_VERSION;
  actions: SeamActionV1[];
}

export class ManifestValidationError extends Error {
  readonly issues: ValidationIssue[];
  constructor(issues: ValidationIssue[]) {
    super(issues.map((i) => `${i.path}: ${i.message}`).join("; "));
    this.name = "ManifestValidationError";
    this.issues = issues;
  }
}

function validateAction(action: unknown, index: number, seenIds: Set<string>): ValidationIssue[] {
  const path = `actions[${index}]`;
  const issues: ValidationIssue[] = [];
  if (!isPlainObject(action)) {
    return [issue(path, "ACTION_NOT_OBJECT", "Action must be a plain object")];
  }
  const keys = Object.keys(action);
  for (const key of keys) {
    if (key !== "id" && key !== "capability" && key !== "params") {
      issues.push(issue(`${path}.${key}`, "UNKNOWN_FIELD", `Unknown action field: ${key}`));
    }
  }
  if (typeof action.id !== "string" || action.id.length === 0) {
    issues.push(issue(`${path}.id`, "INVALID_ID", "Action id must be a non-empty string"));
  } else {
    if (seenIds.has(action.id)) {
      issues.push(issue(`${path}.id`, "DUPLICATE_ID", `Duplicate action id: ${action.id}`));
    }
    seenIds.add(action.id);
  }
  if (typeof action.capability !== "string" || action.capability.length === 0) {
    issues.push(
      issue(
        `${path}.capability`,
        "INVALID_CAPABILITY",
        "Capability must be a non-empty opaque string",
      ),
    );
  }
  if (!isPlainObject(action.params)) {
    issues.push(issue(`${path}.params`, "INVALID_PARAMS", "Params must be a plain JSON object"));
  } else {
    try {
      toJsonValue(action.params);
    } catch (e) {
      issues.push(
        issue(
          `${path}.params`,
          "NON_JSON_PARAMS",
          e instanceof Error ? e.message : "Params are not JSON-safe",
        ),
      );
    }
  }
  return issues;
}

export function validateManifest(input: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isPlainObject(input)) {
    return [issue("", "ROOT_NOT_OBJECT", "Manifest must be a plain object")];
  }
  for (const key of Object.keys(input)) {
    if (key !== "seam" && key !== "actions") {
      issues.push(issue(key, "UNKNOWN_FIELD", `Unknown root field: ${key}`));
    }
  }
  if (input.seam !== SEAM_MANIFEST_VERSION) {
    issues.push(issue("seam", "INVALID_VERSION", `Expected seam: "${SEAM_MANIFEST_VERSION}"`));
  }
  if (!Array.isArray(input.actions) || input.actions.length === 0) {
    issues.push(issue("actions", "EMPTY_ACTIONS", "actions must be a non-empty array"));
  } else {
    const seen = new Set<string>();
    input.actions.forEach((action, i) => {
      issues.push(...validateAction(action, i, seen));
    });
  }
  return issues;
}

export function parseManifest(input: unknown): SeamManifestV1 {
  const issues = validateManifest(input);
  if (issues.length > 0) {
    throw new ManifestValidationError(issues);
  }
  const obj = input as SeamManifestV1;
  const copied: SeamManifestV1 = {
    seam: SEAM_MANIFEST_VERSION,
    actions: obj.actions.map((a) => ({
      id: a.id,
      capability: a.capability,
      params: cloneJson(toJsonValue(a.params) as JsonObject),
    })),
  };
  return copied;
}
