import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex } from "@noble/hashes/utils";
import { as0x } from "./hex.js";
import type { RuntimeIdentityV1 } from "./fingerprint.js";

export interface PalletCallInventory {
  pallet: string;
  index: number;
  calls: { name: string; index: number }[];
}

export interface RuntimeApiInventory {
  name: string;
  methods: string[];
}

export interface RuntimeSnapshotV1 {
  schemaVersion: 1;
  chainName: string;
  genesisHash: `0x${string}`;
  finalizedBlockHash: `0x${string}`;
  finalizedBlockNumber: number;
  specName: string;
  specVersion: number;
  transactionVersion: number;
  stateVersion: number | null;
  metadataVersion: number;
  metadata: {
    hash: `0x${string}`;
    byteLength: number;
  };
  pallets: PalletCallInventory[];
  runtimeApis: RuntimeApiInventory[];
}

export interface ObservationMetadataV1 {
  observedAtIso?: string;
  rpcUrl?: string;
  transport?: string;
  source: "live" | "synthetic_fixture";
}

export interface RuntimeEvidenceBundleV1 {
  snapshot: RuntimeSnapshotV1;
  metadataBytesHex: `0x${string}`;
}

export function hashMetadataBytes(bytes: Uint8Array): `0x${string}` {
  return `0x${bytesToHex(sha256(bytes))}`;
}

export function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (h.length % 2 !== 0) throw new Error("INVALID_HEX_LENGTH");
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(h.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error("INVALID_HEX");
    out[i] = byte;
  }
  return out;
}

export function bytesToHex0x(bytes: Uint8Array): `0x${string}` {
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export function validateRuntimeEvidence(bundle: RuntimeEvidenceBundleV1): {
  ok: boolean;
  reason?: string;
} {
  try {
    const bytes = hexToBytes(bundle.metadataBytesHex);
    const hash = hashMetadataBytes(bytes);
    if (hash !== as0x(bundle.snapshot.metadata.hash)) {
      return { ok: false, reason: "SHA256(metadata bytes) does not match snapshot.metadata.hash" };
    }
    if (bytes.length !== bundle.snapshot.metadata.byteLength) {
      return { ok: false, reason: "Metadata byte length mismatch" };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "Invalid evidence" };
  }
}

export function identityFromSnapshot(snapshot: RuntimeSnapshotV1): RuntimeIdentityV1 {
  return {
    genesisHash: as0x(snapshot.genesisHash),
    specName: snapshot.specName,
    specVersion: snapshot.specVersion,
    transactionVersion: snapshot.transactionVersion,
    stateVersion: snapshot.stateVersion,
    metadataVersion: snapshot.metadataVersion,
    metadataHash: as0x(snapshot.metadata.hash),
  };
}
