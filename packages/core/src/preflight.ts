import { checkRuntimeLock, type RuntimeLockCheck, type RuntimeLockV1 } from "./lock.js";
import type { RuntimeIdentityV1 } from "./fingerprint.js";
import type { CapabilityEvidenceV1 } from "./capabilities.js";
import { capabilityStateOf } from "./capabilities.js";
import type { ManifestDigestV1 } from "./digest.js";
import type { PortaldotExecutionPlanV1 } from "./plan.js";

export type PreflightResult = "pass" | "block" | "unknown";

export interface ActionSimulationV1 {
  actionId: string;
  result: PreflightResult;
  weight: { refTime: string; proofSize: string } | null;
  storageDeposit: string | null;
  fee: string | null;
  revert: boolean;
  notes: string[];
}

export interface PreflightReportV1 {
  schemaVersion: 1;
  manifestDigest: ManifestDigestV1;
  planCompilerVersion: string;
  runtimeLock: RuntimeLockV1;
  lockCheck: RuntimeLockCheck;
  capabilityEvidence: CapabilityEvidenceV1;
  simulations: ActionSimulationV1[];
  weight: { refTime: string; proofSize: string } | null;
  storageDeposit: string | null;
  fee: string | null;
  strategy: PortaldotExecutionPlanV1["strategy"];
  blockers: string[];
  warnings: string[];
  result: PreflightResult;
}

export function buildPreflightReport(args: {
  plan: PortaldotExecutionPlanV1;
  currentIdentity: RuntimeIdentityV1 | null;
  capabilities: CapabilityEvidenceV1;
  simulations?: ActionSimulationV1[];
  weight?: { refTime: string; proofSize: string } | null;
  storageDeposit?: string | null;
  fee?: string | null;
  extraBlockers?: string[];
  warnings?: string[];
}): PreflightReportV1 {
  const lockCheck = checkRuntimeLock(args.plan.runtimeLock, args.currentIdentity);
  const blockers: string[] = [...args.plan.unresolvedBlockers, ...(args.extraBlockers ?? [])];
  const warnings = [...(args.warnings ?? [])];
  if (lockCheck.state === "mismatch") {
    blockers.push(`Runtime lock mismatch: ${lockCheck.mismatchedFields.join(", ")}`);
  }
  if (lockCheck.state === "unknown") {
    blockers.push(`Runtime lock unknown: ${lockCheck.reason ?? "unknown"}`);
  }
  for (const cap of args.plan.requiredCapabilities) {
    const state = capabilityStateOf(args.capabilities, cap);
    if (state !== "observed") {
      blockers.push(`Required capability ${cap} is ${state}`);
    }
  }
  const simulations =
    args.simulations ??
    args.plan.steps.map((s) => ({
      actionId: s.actionId,
      result: (s.status === "compiled" ? "unknown" : "block") as PreflightResult,
      weight: null,
      storageDeposit: null,
      fee: null,
      revert: false,
      notes: s.status === "compiled" ? ["Simulation not executed"] : s.blockers,
    }));
  for (const sim of simulations) {
    if (sim.result === "block") blockers.push(`Simulation blocked for ${sim.actionId}`);
    if (sim.revert) blockers.push(`Simulation reverted for ${sim.actionId}`);
  }
  let result: PreflightResult = "pass";
  if (blockers.length > 0) result = "block";
  else if (simulations.some((s) => s.result === "unknown") || lockCheck.state === "unknown") {
    result = "unknown";
  }
  if (result === "unknown") {
    blockers.push("UNKNOWN blocks execution");
    result = "block";
  }
  return {
    schemaVersion: 1,
    manifestDigest: args.plan.manifestDigest,
    planCompilerVersion: args.plan.compilerVersion,
    runtimeLock: args.plan.runtimeLock,
    lockCheck,
    capabilityEvidence: args.capabilities,
    simulations,
    weight: args.weight ?? null,
    storageDeposit: args.storageDeposit ?? null,
    fee: args.fee ?? null,
    strategy: args.plan.strategy,
    blockers,
    warnings,
    result,
  };
}
