import {
  COMPILER_VERSION,
  digestCanonicalObject,
  digestManifest,
  type ExecutionPlanDigestV1,
  type ManifestDigestV1,
} from "./digest.js";
import { capabilityStateOf, type CapabilityEvidenceV1 } from "./capabilities.js";
import type { RuntimeLockV1 } from "./lock.js";
import { parseManifest, type SeamManifestV1 } from "./manifest.js";
import { validateCapabilityParams } from "./schemas.js";
import type { JsonObject } from "./json.js";

export type ExecutionSurface = "native" | "revive";
export type PlanStepStatus = "compiled" | "blocked";

export interface ExecutionPlanStepV1 {
  actionId: string;
  capability: string;
  surface: ExecutionSurface;
  target: { pallet?: string; call?: string; runtimeApi?: string };
  normalizedParams: JsonObject;
  runtimeFingerprint: `0x${string}`;
  status: PlanStepStatus;
  blockers: string[];
  encodedCallHex?: `0x${string}`;
  palletIndex?: number;
  callIndex?: number;
}

export type CrossVmStrategy =
  "atomic_verified" | "atomic_unverified" | "sequential" | "unavailable";

export interface PortaldotExecutionPlanV1 {
  schemaVersion: 1;
  compilerVersion: string;
  manifestDigest: ManifestDigestV1;
  runtimeLock: RuntimeLockV1;
  evidenceIdentity: {
    genesisHash: `0x${string}`;
    metadataHash: `0x${string}`;
    specVersion: number;
  };
  requiredCapabilities: string[];
  steps: ExecutionPlanStepV1[];
  strategy: CrossVmStrategy;
  unresolvedBlockers: string[];
}

export function surfaceForCapability(capability: string): ExecutionSurface {
  if (capability.startsWith("revive.")) return "revive";
  return "native";
}

export function compileExecutionPlan(args: {
  manifest: SeamManifestV1 | unknown;
  lock: RuntimeLockV1;
  capabilities: CapabilityEvidenceV1;
  strategy: CrossVmStrategy;
  encodedCalls?: Record<
    string,
    { hex: `0x${string}`; palletIndex: number; callIndex: number; pallet: string; call: string }
  >;
}): PortaldotExecutionPlanV1 {
  const manifest = parseManifest(args.manifest);
  const digest = digestManifest(manifest);
  const blockers: string[] = [];
  const steps: ExecutionPlanStepV1[] = manifest.actions.map((action) => {
    const capState = capabilityStateOf(args.capabilities, action.capability);
    const paramIssues = validateCapabilityParams(action.capability, action.params);
    const stepBlockers: string[] = [];
    if (capState === "unknown") stepBlockers.push(`Capability ${action.capability} is unknown`);
    if (capState === "not_observed")
      stepBlockers.push(`Capability ${action.capability} is not_observed`);
    for (const i of paramIssues) {
      stepBlockers.push(`${action.id}.${i.path}: ${i.message}`);
    }
    const encoded = args.encodedCalls?.[action.id];
    const status: PlanStepStatus = stepBlockers.length === 0 ? "compiled" : "blocked";
    if (status === "blocked") blockers.push(...stepBlockers);
    const step: ExecutionPlanStepV1 = {
      actionId: action.id,
      capability: action.capability,
      surface: surfaceForCapability(action.capability),
      target: encoded
        ? { pallet: encoded.pallet, call: encoded.call }
        : action.capability === "revive.call"
          ? { pallet: "Revive", call: "call" }
          : {},
      normalizedParams: action.params,
      runtimeFingerprint: args.lock.fingerprint.value,
      status,
      blockers: stepBlockers,
    };
    if (encoded) {
      step.encodedCallHex = encoded.hex;
      step.palletIndex = encoded.palletIndex;
      step.callIndex = encoded.callIndex;
    }
    return step;
  });
  return {
    schemaVersion: 1,
    compilerVersion: COMPILER_VERSION,
    manifestDigest: digest,
    runtimeLock: args.lock,
    evidenceIdentity: {
      genesisHash: args.lock.identity.genesisHash,
      metadataHash: args.lock.identity.metadataHash,
      specVersion: args.lock.identity.specVersion,
    },
    requiredCapabilities: [...new Set(manifest.actions.map((a) => a.capability))],
    steps,
    strategy: args.strategy,
    unresolvedBlockers: blockers,
  };
}

export function digestExecutionPlan(plan: PortaldotExecutionPlanV1): ExecutionPlanDigestV1 {
  return digestCanonicalObject("SEAM_EXECUTION_PLAN_V1", plan);
}
