import {
  compileExecutionPlan,
  createRuntimeLock,
  identityFromSnapshot,
  parseManifest,
  type CapabilityEvidenceV1,
  type PortaldotExecutionPlanV1,
  type RuntimeSnapshotV1,
  type SeamManifestV1,
} from "@seam/core";
import { lookupCall, parseMetadataInventory } from "./metadata.js";
import { encodeBatchAll, encodeNativeCall } from "./encode.js";
import { ATOMICITY_PROVEN, classifyCrossVmStrategy } from "./strategy.js";
import { hexToBytes } from "./scale.js";

export function compilePortaldotPlan(args: {
  manifest: SeamManifestV1 | unknown;
  snapshot: RuntimeSnapshotV1;
  capabilities: CapabilityEvidenceV1;
  metadataHex?: string;
}): PortaldotExecutionPlanV1 {
  const manifest = parseManifest(args.manifest);
  const lock = createRuntimeLock(identityFromSnapshot(args.snapshot));
  const inventory = args.metadataHex
    ? parseMetadataInventory(args.metadataHex)
    : {
        version: args.snapshot.metadataVersion,
        pallets: args.snapshot.pallets,
        runtimeApis: args.snapshot.runtimeApis,
      };
  const encodedCalls: Record<
    string,
    { hex: `0x${string}`; palletIndex: number; callIndex: number; pallet: string; call: string }
  > = {};
  const inner: Uint8Array[] = [];
  for (const action of manifest.actions) {
    const map: Record<string, [string, string]> = {
      "assets.transfer": ["Assets", "transfer"],
      "assets.mint": ["Assets", "mint"],
      "nfts.mint": ["Nfts", "mint"],
      "revive.call": ["Revive", "call"],
    };
    const pair = map[action.capability];
    if (!pair) continue;
    const lookup = lookupCall(inventory, pair[0], pair[1]);
    if (!lookup) continue;
    try {
      const hex = encodeNativeCall(lookup, action.capability, action.params);
      encodedCalls[action.id] = {
        hex,
        palletIndex: lookup.palletIndex,
        callIndex: lookup.callIndex,
        pallet: lookup.pallet,
        call: lookup.call,
      };
      inner.push(hexToBytes(hex));
    } catch {
      // leave unencoded; plan blockers capture param issues
    }
  }
  const strategy = classifyCrossVmStrategy(args.capabilities, ATOMICITY_PROVEN);
  const plan = compileExecutionPlan({
    manifest,
    lock,
    capabilities: args.capabilities,
    strategy,
    encodedCalls,
  });
  if (strategy === "atomic_unverified" || strategy === "atomic_verified") {
    const util = lookupCall(inventory, "Utility", "batch_all");
    if (util && inner.length === manifest.actions.length) {
      const batch = encodeBatchAll(util, inner);
      plan.steps.forEach((s) => {
        s.encodedCallHex = batch;
      });
    }
  }
  return plan;
}
