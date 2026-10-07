import type { PortaldotExecutionPlanV1 } from "./plan.js";
import type { JsonValue } from "./json.js";

export interface ExecutionPolicyV1 {
  schemaVersion: 1;
  allowedCapabilities?: string[];
  deniedCapabilities?: string[];
  allowedAssetIds?: string[];
  allowedContracts?: string[];
  allowedRecipients?: string[];
  maximumNativeValue?: string | null;
  maximumActionCount?: number;
  maximumWeightRefTime?: string | null;
  maximumStorageDeposit?: string | null;
  requireHumanApproval: boolean;
  expiresAtUnix?: number | null;
}

export interface PolicyReason {
  code: string;
  message: string;
}

export interface PolicyDecisionV1 {
  schemaVersion: 1;
  result: "pass" | "block";
  reasons: PolicyReason[];
  requireHumanApproval: boolean;
}

function inList(list: string[] | undefined, value: string | undefined): boolean {
  if (!list || list.length === 0) return true;
  if (!value) return false;
  return list.includes(value);
}

export function evaluatePolicy(
  policy: ExecutionPolicyV1,
  plan: PortaldotExecutionPlanV1,
  nowUnix = Math.floor(Date.now() / 1000),
): PolicyDecisionV1 {
  const reasons: PolicyReason[] = [];
  if (policy.expiresAtUnix != null && nowUnix > policy.expiresAtUnix) {
    reasons.push({ code: "EXPIRED", message: "Policy has expired" });
  }
  if (policy.maximumActionCount != null && plan.steps.length > policy.maximumActionCount) {
    reasons.push({
      code: "ACTION_COUNT",
      message: `Plan has ${plan.steps.length} actions; max is ${policy.maximumActionCount}`,
    });
  }
  for (const step of plan.steps) {
    if (policy.deniedCapabilities?.includes(step.capability)) {
      reasons.push({ code: "DENIED_CAPABILITY", message: `${step.capability} is denied` });
    }
    if (policy.allowedCapabilities && !policy.allowedCapabilities.includes(step.capability)) {
      reasons.push({
        code: "CAPABILITY_NOT_ALLOWED",
        message: `${step.capability} is not in allow-list`,
      });
    }
    const params = step.normalizedParams as Record<string, JsonValue>;
    if (step.capability.startsWith("assets.")) {
      const assetId = typeof params.assetId === "string" ? params.assetId : undefined;
      if (!inList(policy.allowedAssetIds, assetId)) {
        reasons.push({
          code: "ASSET_NOT_ALLOWED",
          message: `assetId ${assetId ?? "?"} is not allowed`,
        });
      }
    }
    if (step.capability === "revive.call") {
      const dest = typeof params.dest === "string" ? params.dest.toLowerCase() : undefined;
      if (
        policy.allowedContracts &&
        dest &&
        !policy.allowedContracts.map((c) => c.toLowerCase()).includes(dest)
      ) {
        reasons.push({ code: "CONTRACT_NOT_ALLOWED", message: `contract ${dest} is not allowed` });
      }
    }
  }
  if (plan.unresolvedBlockers.length > 0) {
    reasons.push({ code: "PLAN_BLOCKED", message: "Execution plan has unresolved blockers" });
  }
  return {
    schemaVersion: 1,
    result: reasons.length === 0 ? "pass" : "block",
    reasons,
    requireHumanApproval: policy.requireHumanApproval,
  };
}

export const OPEN_HACKATHON_POLICY: ExecutionPolicyV1 = {
  schemaVersion: 1,
  requireHumanApproval: true,
  maximumActionCount: 16,
};
