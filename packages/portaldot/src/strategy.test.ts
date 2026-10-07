import { describe, expect, it } from "vitest";
import { evaluateCapabilities, type RuntimeSnapshotV1 } from "@seam/core";
import { classifyCrossVmStrategy } from "./strategy.js";
import { bytesToHex, hexToBytes, ScaleWriter } from "./scale.js";

const snap: RuntimeSnapshotV1 = {
  schemaVersion: 1,
  chainName: "synthetic",
  genesisHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  finalizedBlockHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  finalizedBlockNumber: 1,
  specName: "portaldot",
  specVersion: 1,
  transactionVersion: 1,
  stateVersion: 0,
  metadataVersion: 14,
  metadata: {
    hash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    byteLength: 4,
  },
  pallets: [{ pallet: "Utility", index: 1, calls: [{ name: "batch_all", index: 2 }] }],
  runtimeApis: [],
};

describe("CrossVM strategy", () => {
  it("does not mark atomic_verified without proof", () => {
    const ev = evaluateCapabilities(snap);
    expect(classifyCrossVmStrategy(ev, false)).toBe("atomic_unverified");
    expect(classifyCrossVmStrategy(ev, true)).toBe("atomic_verified");
  });
});

describe("SCALE compact", () => {
  it("roundtrips small compact integers", () => {
    const w = new ScaleWriter();
    w.compact(42);
    const hex = bytesToHex(w.toBytes());
    expect(hexToBytes(hex)[0]).toBe(42 << 2);
  });
});
