import type { RuntimeSnapshotV1 } from "./snapshot.js";

export type CapabilityState = "observed" | "not_observed" | "unknown";

export interface CapabilityRequirement {
  capability: string;
  kind: "pallet_call" | "runtime_api" | "presence";
  pallet?: string;
  call?: string;
  api?: string;
  method?: string;
}

export const CAPABILITY_DEFINITIONS: CapabilityRequirement[] = [
  { capability: "utility.batchAll", kind: "pallet_call", pallet: "Utility", call: "batch_all" },
  { capability: "utility.batch", kind: "pallet_call", pallet: "Utility", call: "batch" },
  { capability: "utility.forceBatch", kind: "pallet_call", pallet: "Utility", call: "force_batch" },
  { capability: "assets.mint", kind: "pallet_call", pallet: "Assets", call: "mint" },
  { capability: "assets.transfer", kind: "pallet_call", pallet: "Assets", call: "transfer" },
  { capability: "nfts.mint", kind: "pallet_call", pallet: "Nfts", call: "mint" },
  { capability: "revive.call", kind: "pallet_call", pallet: "Revive", call: "call" },
  { capability: "revive.mapAccount", kind: "pallet_call", pallet: "Revive", call: "map_account" },
  { capability: "revive.runtimeApi.call", kind: "runtime_api", api: "ReviveApi", method: "call" },
  {
    capability: "revive.runtimeApi.accountId",
    kind: "runtime_api",
    api: "ReviveApi",
    method: "accountId",
  },
  { capability: "proxy.presence", kind: "presence", pallet: "Proxy" },
  { capability: "multisig.presence", kind: "presence", pallet: "Multisig" },
];

export interface CapabilityEvidenceItem {
  capability: string;
  state: CapabilityState;
  requirement: CapabilityRequirement;
  matched?: { pallet?: string; call?: string; api?: string; method?: string };
}

export interface CapabilityEvidenceV1 {
  schemaVersion: 1;
  evidenceSource: "snapshot" | "none";
  items: CapabilityEvidenceItem[];
}

function palletExists(snapshot: RuntimeSnapshotV1, name: string) {
  return snapshot.pallets.find((p) => p.pallet.toLowerCase() === name.toLowerCase());
}

function callExists(snapshot: RuntimeSnapshotV1, pallet: string, call: string) {
  const p = palletExists(snapshot, pallet);
  if (!p) return undefined;
  const c = p.calls.find((x) => x.name.toLowerCase() === call.toLowerCase());
  if (!c) return undefined;
  return { pallet: p.pallet, call: c.name };
}

function apiExists(snapshot: RuntimeSnapshotV1, api: string, method: string) {
  const a = snapshot.runtimeApis.find((x) => x.name.toLowerCase() === api.toLowerCase());
  if (!a) return undefined;
  const m = a.methods.find((x) => x.toLowerCase() === method.toLowerCase());
  if (!m) return undefined;
  return { api: a.name, method: m };
}

export function evaluateCapabilities(snapshot: RuntimeSnapshotV1 | null): CapabilityEvidenceV1 {
  if (!snapshot) {
    return {
      schemaVersion: 1,
      evidenceSource: "none",
      items: CAPABILITY_DEFINITIONS.map((requirement) => ({
        capability: requirement.capability,
        state: "unknown" as const,
        requirement,
      })),
    };
  }
  const items: CapabilityEvidenceItem[] = CAPABILITY_DEFINITIONS.map((requirement) => {
    if (requirement.kind === "presence" && requirement.pallet) {
      const p = palletExists(snapshot, requirement.pallet);
      return p
        ? {
            capability: requirement.capability,
            state: "observed" as const,
            requirement,
            matched: { pallet: p.pallet },
          }
        : { capability: requirement.capability, state: "not_observed" as const, requirement };
    }
    if (requirement.kind === "pallet_call" && requirement.pallet && requirement.call) {
      const m = callExists(snapshot, requirement.pallet, requirement.call);
      return m
        ? {
            capability: requirement.capability,
            state: "observed" as const,
            requirement,
            matched: m,
          }
        : { capability: requirement.capability, state: "not_observed" as const, requirement };
    }
    if (requirement.kind === "runtime_api" && requirement.api && requirement.method) {
      const m = apiExists(snapshot, requirement.api, requirement.method);
      return m
        ? {
            capability: requirement.capability,
            state: "observed" as const,
            requirement,
            matched: m,
          }
        : { capability: requirement.capability, state: "not_observed" as const, requirement };
    }
    return { capability: requirement.capability, state: "unknown", requirement };
  });
  return { schemaVersion: 1, evidenceSource: "snapshot", items };
}

export function capabilityStateOf(
  evidence: CapabilityEvidenceV1,
  capability: string,
): CapabilityState {
  return evidence.items.find((i) => i.capability === capability)?.state ?? "unknown";
}
