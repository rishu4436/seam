import { issue, type ValidationIssue } from "./issues.js";
import { isPlainObject } from "./json.js";

const UINT_RE = /^(0|[1-9][0-9]*)$/;
const H160_RE = /^0x[0-9a-fA-F]{40}$/;
const BYTES_RE = /^0x[0-9a-fA-F]*$/;

export type AddressDomain = "ss58" | "accountId32Hex" | "h160";

export interface AddressValue {
  domain: AddressDomain;
  value: string;
}

function rejectJsNumber(path: string, value: unknown, issues: ValidationIssue[]) {
  if (typeof value === "number") {
    issues.push(
      issue(
        path,
        "UNSAFE_NUMBER",
        "Use a decimal string for blockchain integers; JS numbers are rejected",
      ),
    );
    return true;
  }
  return false;
}

function requireUintString(path: string, value: unknown, issues: ValidationIssue[]) {
  if (rejectJsNumber(path, value, issues)) return;
  if (typeof value !== "string" || !UINT_RE.test(value)) {
    issues.push(issue(path, "INVALID_UINT", "Expected a decimal integer string"));
  }
}

function requireAddress(
  path: string,
  value: unknown,
  issues: ValidationIssue[],
  allowH160 = false,
) {
  if (
    !isPlainObject(value) ||
    typeof value.domain !== "string" ||
    typeof value.value !== "string"
  ) {
    issues.push(
      issue(
        path,
        "INVALID_ADDRESS",
        'Address must be { domain: "ss58" | "accountId32Hex" | "h160", value: string }',
      ),
    );
    return;
  }
  if (value.domain === "h160") {
    if (!allowH160) {
      issues.push(
        issue(path, "H160_NOT_ALLOWED", "H160 is not valid for this native account field"),
      );
    }
    if (!H160_RE.test(value.value)) {
      issues.push(issue(path, "INVALID_H160", "H160 must be 0x + 40 hex chars"));
    }
    return;
  }
  if (value.domain === "accountId32Hex") {
    if (!/^0x[0-9a-fA-F]{64}$/.test(value.value)) {
      issues.push(issue(path, "INVALID_ACCOUNTID32", "AccountId32 hex must be 0x + 64 hex chars"));
    }
    return;
  }
  if (value.domain === "ss58") {
    if (value.value.length < 4) {
      issues.push(issue(path, "INVALID_SS58", "SS58 value is empty or too short"));
    }
    return;
  }
  issues.push(
    issue(path, "UNKNOWN_ADDRESS_DOMAIN", `Unknown address domain: ${String(value.domain)}`),
  );
}

export function validateCapabilityParams(capability: string, params: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isPlainObject(params)) {
    return [issue("", "PARAMS_NOT_OBJECT", "Params must be an object")];
  }
  switch (capability) {
    case "assets.transfer": {
      requireUintString("assetId", params.assetId, issues);
      requireAddress("target", params.target, issues);
      requireUintString("amount", params.amount, issues);
      break;
    }
    case "assets.mint": {
      requireUintString("assetId", params.assetId, issues);
      requireAddress("beneficiary", params.beneficiary, issues);
      requireUintString("amount", params.amount, issues);
      break;
    }
    case "nfts.mint": {
      requireUintString("collectionId", params.collectionId, issues);
      requireUintString("itemId", params.itemId, issues);
      requireAddress("owner", params.owner, issues);
      break;
    }
    case "revive.call": {
      if (typeof params.dest !== "string" || !H160_RE.test(params.dest)) {
        issues.push(issue("dest", "INVALID_H160", "dest must be H160 0x + 40 hex"));
      }
      requireUintString("value", params.value, issues);
      if (
        typeof params.data !== "string" ||
        !BYTES_RE.test(params.data) ||
        params.data.length % 2 !== 0
      ) {
        issues.push(issue("data", "INVALID_BYTES", "data must be even-length 0x hex"));
      }
      break;
    }
    default:
      break;
  }
  return issues;
}
