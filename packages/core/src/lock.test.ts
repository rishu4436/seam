import { describe, expect, it } from "vitest";
import { createRuntimeFingerprint } from "./fingerprint.js";
import { createRuntimeLock } from "./lock.js";
import { evaluateCapabilities } from "./capabilities.js";
import { compileExecutionPlan } from "./plan.js";
import { buildPreflightReport } from "./preflight.js";
import { evaluatePolicy, OPEN_HACKATHON_POLICY } from "./policy.js";
import { prepareExecution } from "./prepare.js";
import type { RuntimeSnapshotV1 } from "./snapshot.js";
import { evaluateRuntimeGuard } from "./runtimguard.js";

const identityA = {
  genesisHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const,
  specName: "portaldot",
  specVersion: 1,
  transactionVersion: 1,
  stateVersion: 0,
  metadataVersion: 14,
  metadataHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const,
};

const identityB = { ...identityA, specVersion: 2 };

function syntheticSnapshot(specVersion: number): RuntimeSnapshotV1 {
  return {
    schemaVersion: 1,
    chainName: "synthetic",
    genesisHash: identityA.genesisHash,
    finalizedBlockHash: identityA.genesisHash,
    finalizedBlockNumber: 1,
    specName: "portaldot",
    specVersion,
    transactionVersion: 1,
    stateVersion: 0,
    metadataVersion: 14,
    metadata: { hash: identityA.metadataHash, byteLength: 4 },
    pallets: [
      {
        pallet: "Assets",
        index: 50,
        calls: [
          { name: "transfer", index: 8 },
          { name: "mint", index: 3 },
        ],
      },
      { pallet: "Nfts", index: 71, calls: [{ name: "mint", index: 3 }] },
      { pallet: "Revive", index: 60, calls: [{ name: "call", index: 1 }] },
      { pallet: "Utility", index: 1, calls: [{ name: "batch_all", index: 2 }] },
    ],
    runtimeApis: [{ name: "ReviveApi", methods: ["call", "accountId"] }],
  };
}

describe("runtime fingerprint and lock", () => {
  it("does not normalize specName", () => {
    const a = createRuntimeFingerprint({ ...identityA, specName: "PortalDot" });
    const b = createRuntimeFingerprint({ ...identityA, specName: "portaldot" });
    expect(a.value).not.toBe(b.value);
  });

  it("blocks execution after specVersion change (synthetic RuntimeGuard demo)", () => {
    const snapA = syntheticSnapshot(1);
    const lock = createRuntimeLock(identityA);
    const caps = evaluateCapabilities(snapA);
    const plan = compileExecutionPlan({
      manifest: {
        seam: "1",
        actions: [
          {
            id: "t",
            capability: "assets.transfer",
            params: {
              assetId: "1",
              amount: "1",
              target: { domain: "ss58", value: "5FakeAddressForSyntheticTestsxxxxxxxxxxx" },
            },
          },
        ],
      },
      lock,
      capabilities: caps,
      strategy: "sequential",
    });
    const preflight = buildPreflightReport({
      plan,
      currentIdentity: identityB,
      capabilities: caps,
      simulations: [
        {
          actionId: "t",
          result: "pass",
          weight: null,
          storageDeposit: null,
          fee: null,
          revert: false,
          notes: ["synthetic"],
        },
      ],
    });
    expect(preflight.result).toBe("block");
    const policy = evaluatePolicy(OPEN_HACKATHON_POLICY, plan);
    const prepared = prepareExecution({
      plan,
      preflight,
      policy,
      currentIdentity: identityB,
      callPayloadHex: null,
    });
    expect(prepared.blocked).toBe(true);
    const guard = evaluateRuntimeGuard({
      rpcAvailable: true,
      current: identityB,
      preparedLock: lock,
      currentSnapshot: syntheticSnapshot(2),
      preparedSnapshot: snapA,
    });
    expect(guard.state).toBe("upgrade_detected");
    expect(guard.specVersionChanged).toBe(true);
  });

  it("unknown snapshot yields unknown capabilities", () => {
    const ev = evaluateCapabilities(null);
    expect(ev.items.every((i) => i.state === "unknown")).toBe(true);
  });
});
