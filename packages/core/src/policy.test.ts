import { describe, expect, it } from "vitest";
import { createRuntimeLock } from "./lock.js";
import { compileExecutionPlan } from "./plan.js";
import { evaluateCapabilities } from "./capabilities.js";
import { evaluatePolicy } from "./policy.js";
import { verifyStep } from "./verify.js";
import { summarizeCoverage } from "./receipt.js";
import type { RuntimeSnapshotV1 } from "./snapshot.js";

const identity = {
  genesisHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const,
  specName: "portaldot",
  specVersion: 1,
  transactionVersion: 1,
  stateVersion: 0,
  metadataVersion: 14,
  metadataHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const,
};

const snapshot: RuntimeSnapshotV1 = {
  schemaVersion: 1,
  chainName: "synthetic",
  genesisHash: identity.genesisHash,
  finalizedBlockHash: identity.genesisHash,
  finalizedBlockNumber: 1,
  specName: "portaldot",
  specVersion: 1,
  transactionVersion: 1,
  stateVersion: 0,
  metadataVersion: 14,
  metadata: { hash: identity.metadataHash, byteLength: 4 },
  pallets: [{ pallet: "Assets", index: 50, calls: [{ name: "transfer", index: 8 }] }],
  runtimeApis: [],
};

describe("policy", () => {
  it("fail closed on denied capability", () => {
    const plan = compileExecutionPlan({
      manifest: {
        seam: "1",
        actions: [
          {
            id: "t",
            capability: "assets.transfer",
            params: {
              assetId: "9",
              amount: "1",
              target: { domain: "ss58", value: "5FakeAddressForSyntheticTestsxxxxxxxxxxx" },
            },
          },
        ],
      },
      lock: createRuntimeLock(identity),
      capabilities: evaluateCapabilities(snapshot),
      strategy: "sequential",
    });
    const decision = evaluatePolicy(
      {
        schemaVersion: 1,
        requireHumanApproval: true,
        deniedCapabilities: ["assets.transfer"],
      },
      plan,
    );
    expect(decision.result).toBe("block");
  });
});

describe("verifiers", () => {
  it("marks unknown when expected event is missing", () => {
    const step = verifyStep(
      { actionId: "t", kind: "assets.transfer", details: {} },
      [{ pallet: "System", method: "ExtrinsicSuccess", data: {} }],
      true,
    );
    expect(step.status).toBe("unknown");
    const cov = summarizeCoverage([step]);
    expect(cov.overall).toBe("unknown");
  });
});
