import {
  createRuntimeFingerprint,
  type RuntimeFingerprintV1,
  type RuntimeIdentityV1,
} from "./fingerprint.js";
import { isPlainObject } from "./json.js";

export interface RuntimeLockV1 {
  schemaVersion: 1;
  fingerprint: RuntimeFingerprintV1;
  identity: RuntimeIdentityV1;
}

export type RuntimeLockCheckState = "match" | "mismatch" | "unknown";

export type RuntimeLockField =
  | "genesisHash"
  | "specName"
  | "specVersion"
  | "transactionVersion"
  | "stateVersion"
  | "metadataVersion"
  | "metadataHash";

export interface RuntimeLockCheck {
  state: RuntimeLockCheckState;
  mismatchedFields: RuntimeLockField[];
  reason?: string;
}

export function isRuntimeLock(input: unknown): input is RuntimeLockV1 {
  if (!isPlainObject(input)) return false;
  if (input.schemaVersion !== 1) return false;
  if (!isPlainObject(input.fingerprint) || !isPlainObject(input.identity)) return false;
  return true;
}

export function createRuntimeLock(identity: RuntimeIdentityV1): RuntimeLockV1 {
  const fingerprint = createRuntimeFingerprint(identity);
  return {
    schemaVersion: 1,
    fingerprint,
    identity: fingerprint.identity,
  };
}

export function validateLockIntegrity(lock: RuntimeLockV1): RuntimeLockCheck {
  const recomputed = createRuntimeFingerprint(lock.identity);
  if (recomputed.value !== lock.fingerprint.value) {
    return {
      state: "unknown",
      mismatchedFields: [],
      reason: "Lock identity does not recompute to stored fingerprint",
    };
  }
  const id = lock.fingerprint.identity;
  const fields: RuntimeLockField[] = [];
  (
    [
      "genesisHash",
      "specName",
      "specVersion",
      "transactionVersion",
      "stateVersion",
      "metadataVersion",
      "metadataHash",
    ] as const
  ).forEach((f) => {
    if (id[f] !== lock.identity[f]) fields.push(f);
  });
  if (fields.length > 0) {
    return {
      state: "unknown",
      mismatchedFields: fields,
      reason: "Lock internal identity mismatch",
    };
  }
  return { state: "match", mismatchedFields: [] };
}

export function checkRuntimeLock(
  lock: RuntimeLockV1 | unknown,
  current: RuntimeIdentityV1 | null | undefined,
): RuntimeLockCheck {
  if (!isRuntimeLock(lock)) {
    return { state: "unknown", mismatchedFields: [], reason: "Invalid or corrupted lock" };
  }
  const integrity = validateLockIntegrity(lock);
  if (integrity.state !== "match") return integrity;
  if (!current) {
    return { state: "unknown", mismatchedFields: [], reason: "Missing current runtime evidence" };
  }
  const currentFp = createRuntimeFingerprint(current);
  const fields: RuntimeLockField[] = [];
  const a = lock.identity;
  const b = currentFp.identity;
  if (a.genesisHash !== b.genesisHash) fields.push("genesisHash");
  if (a.specName !== b.specName) fields.push("specName");
  if (a.specVersion !== b.specVersion) fields.push("specVersion");
  if (a.transactionVersion !== b.transactionVersion) fields.push("transactionVersion");
  if (a.stateVersion !== b.stateVersion) fields.push("stateVersion");
  if (a.metadataVersion !== b.metadataVersion) fields.push("metadataVersion");
  if (a.metadataHash !== b.metadataHash) fields.push("metadataHash");
  if (fields.length > 0) {
    return { state: "mismatch", mismatchedFields: fields };
  }
  if (lock.fingerprint.value !== currentFp.value) {
    return {
      state: "mismatch",
      mismatchedFields: ["metadataHash"],
      reason: "Fingerprint mismatch",
    };
  }
  return { state: "match", mismatchedFields: [] };
}
