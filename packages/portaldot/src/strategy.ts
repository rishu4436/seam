import { capabilityStateOf, type CapabilityEvidenceV1, type CrossVmStrategy } from "@seam/core";

/**
 * Atomicity is NEVER claimed without live rollback evidence.
 * Default is sequential until docs/evidence proves otherwise.
 */
export function classifyCrossVmStrategy(
  evidence: CapabilityEvidenceV1,
  atomicityProven: boolean,
): CrossVmStrategy {
  const batchAll = capabilityStateOf(evidence, "utility.batchAll");
  if (batchAll === "unknown") return "unavailable";
  if (batchAll === "not_observed") return "sequential";
  if (atomicityProven) return "atomic_verified";
  return "atomic_unverified";
}

export const ATOMICITY_PROVEN = false;
