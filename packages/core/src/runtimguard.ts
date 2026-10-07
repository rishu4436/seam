import { createRuntimeFingerprint, type RuntimeIdentityV1 } from "./fingerprint.js";
import { checkRuntimeLock, type RuntimeLockV1 } from "./lock.js";
import { evaluateCapabilities, type CapabilityEvidenceV1 } from "./capabilities.js";
import type { RuntimeSnapshotV1 } from "./snapshot.js";

export type RuntimeGuardState =
  "unchanged" | "upgrade_detected" | "capability_drift" | "unavailable";

export interface RuntimeGuardReportV1 {
  schemaVersion: 1;
  rpc: "ok" | "unavailable";
  state: RuntimeGuardState;
  currentFingerprint?: `0x${string}`;
  preparedFingerprint?: `0x${string}`;
  specVersionChanged: boolean;
  metadataHashChanged: boolean;
  capabilityDrift: string[];
  notes: string[];
}

export function diffCapabilities(a: CapabilityEvidenceV1, b: CapabilityEvidenceV1): string[] {
  const drift: string[] = [];
  for (const item of a.items) {
    const other = b.items.find((x) => x.capability === item.capability);
    if (!other || other.state !== item.state) {
      drift.push(`${item.capability}: ${item.state} → ${other?.state ?? "missing"}`);
    }
  }
  return drift;
}

export function evaluateRuntimeGuard(args: {
  rpcAvailable: boolean;
  current?: RuntimeIdentityV1 | null;
  preparedLock?: RuntimeLockV1 | null;
  currentSnapshot?: RuntimeSnapshotV1 | null;
  preparedSnapshot?: RuntimeSnapshotV1 | null;
}): RuntimeGuardReportV1 {
  if (!args.rpcAvailable || !args.current) {
    return {
      schemaVersion: 1,
      rpc: "unavailable",
      state: "unavailable",
      specVersionChanged: false,
      metadataHashChanged: false,
      capabilityDrift: [],
      notes: ["RPC UNAVAILABLE"],
    };
  }
  const currentFp = createRuntimeFingerprint(args.current);
  const notes: string[] = [];
  let state: RuntimeGuardState = "unchanged";
  let specVersionChanged = false;
  let metadataHashChanged = false;
  const capabilityDrift: string[] = [];
  if (args.preparedLock) {
    const check = checkRuntimeLock(args.preparedLock, args.current);
    if (check.state === "mismatch") {
      specVersionChanged = check.mismatchedFields.includes("specVersion");
      metadataHashChanged = check.mismatchedFields.includes("metadataHash");
      state = "upgrade_detected";
      notes.push(`Lock mismatch: ${check.mismatchedFields.join(", ")}`);
    }
  }
  if (args.currentSnapshot && args.preparedSnapshot) {
    const a = evaluateCapabilities(args.preparedSnapshot);
    const b = evaluateCapabilities(args.currentSnapshot);
    capabilityDrift.push(...diffCapabilities(a, b));
    if (capabilityDrift.length > 0 && state === "unchanged") {
      state = "capability_drift";
    }
  }
  const report: RuntimeGuardReportV1 = {
    schemaVersion: 1,
    rpc: "ok",
    state,
    currentFingerprint: currentFp.value,
    specVersionChanged,
    metadataHashChanged,
    capabilityDrift,
    notes,
  };
  if (args.preparedLock) report.preparedFingerprint = args.preparedLock.fingerprint.value;
  return report;
}
