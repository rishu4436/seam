import type { ExecutionPlanDigestV1, ManifestDigestV1 } from "./digest.js";
import type { RuntimeFingerprintV1 } from "./fingerprint.js";
import type { RuntimeLockV1 } from "./lock.js";
import type { CrossVmStrategy } from "./plan.js";
import type { PolicyDecisionV1 } from "./policy.js";

export type VerificationStatus = "verified" | "failed" | "unknown";

export interface ObservedEventV1 {
  pallet: string;
  method: string;
  data: unknown;
}

export interface StepVerificationV1 {
  actionId: string;
  status: VerificationStatus;
  notes: string[];
}

export interface ExecutionReceiptV1 {
  schemaVersion: 1;
  manifestDigest: ManifestDigestV1;
  executionPlanDigest: ExecutionPlanDigestV1;
  compilerVersion: string;
  runtimeFingerprint: RuntimeFingerprintV1;
  runtimeLock: RuntimeLockV1;
  policy: PolicyDecisionV1;
  strategy: CrossVmStrategy;
  signerAddress: string;
  extrinsicHash: `0x${string}` | null;
  blockHash: `0x${string}` | null;
  blockNumber: number | null;
  extrinsicIndex: number | null;
  finalized: boolean;
  dispatchSuccess: boolean | null;
  dispatchError: string | null;
  events: ObservedEventV1[];
  expectedSteps: StepVerificationV1[];
  coverage: {
    verifiedSteps: number;
    failedSteps: number;
    unknownSteps: number;
    notes: string;
  };
  overall: VerificationStatus;
  observation: {
    capturedAtIso?: string;
  };
}

export function summarizeCoverage(steps: StepVerificationV1[]): ExecutionReceiptV1["coverage"] & {
  overall: VerificationStatus;
} {
  const verifiedSteps = steps.filter((s) => s.status === "verified").length;
  const failedSteps = steps.filter((s) => s.status === "failed").length;
  const unknownSteps = steps.filter((s) => s.status === "unknown").length;
  let overall: VerificationStatus = "verified";
  if (failedSteps > 0) overall = "failed";
  else if (unknownSteps > 0) overall = "unknown";
  if (steps.length === 0) overall = "unknown";
  return {
    verifiedSteps,
    failedSteps,
    unknownSteps,
    notes:
      "Verified means observed chain outcome matched declared expected execution within SEAM verifier coverage. It does not prove RPC honesty or complete global state.",
    overall,
  };
}
