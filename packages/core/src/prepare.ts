import { type ExecutionPlanDigestV1, type ManifestDigestV1 } from "./digest.js";
import type { RuntimeLockV1 } from "./lock.js";
import { checkRuntimeLock } from "./lock.js";
import type { PortaldotExecutionPlanV1 } from "./plan.js";
import { digestExecutionPlan } from "./plan.js";
import type { PolicyDecisionV1 } from "./policy.js";
import type { PreflightReportV1 } from "./preflight.js";
import type { RuntimeIdentityV1 } from "./fingerprint.js";

export interface ExpectedOutcomeAssertionV1 {
  actionId: string;
  kind: "assets.transfer" | "assets.mint" | "nfts.mint" | "revive.call";
  details: Record<string, string>;
}

export interface PreparedExecutionV1 {
  schemaVersion: 1;
  manifestDigest: ManifestDigestV1;
  executionPlanDigest: ExecutionPlanDigestV1;
  runtimeLock: RuntimeLockV1;
  preflightResult: PreflightReportV1["result"];
  policyResult: PolicyDecisionV1["result"];
  callPayloadHex: `0x${string}` | null;
  signerDomain: "substrate";
  network: {
    genesisHash: `0x${string}`;
    specName: string;
    specVersion: number;
  };
  expectedOutcomes: ExpectedOutcomeAssertionV1[];
  blocked: boolean;
  blockers: string[];
}

export function prepareExecution(args: {
  plan: PortaldotExecutionPlanV1;
  preflight: PreflightReportV1;
  policy: PolicyDecisionV1;
  currentIdentity: RuntimeIdentityV1 | null;
  callPayloadHex: `0x${string}` | null;
}): PreparedExecutionV1 {
  const blockers: string[] = [];
  const lock = checkRuntimeLock(args.plan.runtimeLock, args.currentIdentity);
  if (lock.state !== "match") blockers.push(`Runtime lock ${lock.state}`);
  if (args.preflight.result !== "pass") blockers.push(`Preflight ${args.preflight.result}`);
  if (args.policy.result !== "pass") blockers.push("Policy blocked");
  const expectedOutcomes: ExpectedOutcomeAssertionV1[] = args.plan.steps
    .filter((s) => s.status === "compiled")
    .map((s) => ({
      actionId: s.actionId,
      kind: s.capability as ExpectedOutcomeAssertionV1["kind"],
      details: Object.fromEntries(
        Object.entries(s.normalizedParams).map(([k, v]) => [
          k,
          typeof v === "string" ? v : JSON.stringify(v),
        ]),
      ),
    }));
  return {
    schemaVersion: 1,
    manifestDigest: args.plan.manifestDigest,
    executionPlanDigest: digestExecutionPlan(args.plan),
    runtimeLock: args.plan.runtimeLock,
    preflightResult: args.preflight.result,
    policyResult: args.policy.result,
    callPayloadHex: args.callPayloadHex,
    signerDomain: "substrate",
    network: {
      genesisHash: args.plan.runtimeLock.identity.genesisHash,
      specName: args.plan.runtimeLock.identity.specName,
      specVersion: args.plan.runtimeLock.identity.specVersion,
    },
    expectedOutcomes,
    blocked: blockers.length > 0,
    blockers,
  };
}
