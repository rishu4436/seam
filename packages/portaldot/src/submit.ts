import {
  SeamBlockedError,
  checkRuntimeLock,
  type PreparedExecutionV1,
  type RuntimeIdentityV1,
} from "@seam/core";
import type { JsonRpcClient } from "./rpc.js";

export interface SubmissionObservation {
  extrinsicHash: `0x${string}` | null;
  blockHash: `0x${string}` | null;
  blockNumber: number | null;
  extrinsicIndex: number | null;
  success: boolean | null;
  dispatchError: string | null;
  events: { pallet: string; method: string; data: unknown }[];
  included: boolean;
  finalized: boolean;
  observedAtIso: string;
}

export async function submitSignedExtrinsic(
  rpc: JsonRpcClient,
  prepared: PreparedExecutionV1,
  signedHex: `0x${string}`,
  currentIdentity: RuntimeIdentityV1 | null,
): Promise<SubmissionObservation> {
  const lock = checkRuntimeLock(prepared.runtimeLock, currentIdentity);
  if (lock.state !== "match") {
    throw new SeamBlockedError("Runtime lock unsafe at submission", [
      `lock ${lock.state}: ${lock.reason ?? lock.mismatchedFields.join(",")}`,
    ]);
  }
  if (prepared.blocked) {
    throw new SeamBlockedError("Prepared execution is blocked", prepared.blockers);
  }
  const hash = await rpc.call<string>("author_submitExtrinsic", [signedHex]);
  return {
    extrinsicHash: hash as `0x${string}`,
    blockHash: null,
    blockNumber: null,
    extrinsicIndex: null,
    success: null,
    dispatchError: null,
    events: [],
    included: false,
    finalized: false,
    observedAtIso: new Date().toISOString(),
  };
}

export async function waitFinalized(
  rpc: JsonRpcClient,
  extrinsicHash: `0x${string}`,
  timeoutMs = 120_000,
): Promise<SubmissionObservation> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const finalized = await rpc.call<string>("chain_getFinalizedHead");
    const block = await rpc.call<{
      block: { header: { number: string }; extrinsics: string[] };
    } | null>("chain_getBlock", [finalized]);
    if (block) {
      const idx = block.block.extrinsics.findIndex(
        (x) => x.startsWith(extrinsicHash) || x.includes(extrinsicHash.slice(2)),
      );
      if (idx >= 0) {
        return {
          extrinsicHash,
          blockHash: finalized as `0x${string}`,
          blockNumber: Number.parseInt(block.block.header.number, 16),
          extrinsicIndex: idx,
          success: null,
          dispatchError: null,
          events: [],
          included: true,
          finalized: true,
          observedAtIso: new Date().toISOString(),
        };
      }
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return {
    extrinsicHash,
    blockHash: null,
    blockNumber: null,
    extrinsicIndex: null,
    success: null,
    dispatchError: "finalization timeout",
    events: [],
    included: false,
    finalized: false,
    observedAtIso: new Date().toISOString(),
  };
}
