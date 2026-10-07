import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex } from "@noble/hashes/utils";
import { as0x, normalizeHex } from "./hex.js";

export const RUNTIME_FINGERPRINT_DOMAIN = "SEAM_RUNTIME_FINGERPRINT";

export interface RuntimeIdentityV1 {
  genesisHash: `0x${string}`;
  specName: string;
  specVersion: number;
  transactionVersion: number;
  stateVersion: number | null;
  metadataVersion: number;
  metadataHash: `0x${string}`;
}

export interface RuntimeFingerprintV1 {
  schemaVersion: 1;
  algorithm: "sha256";
  value: `0x${string}`;
  identity: RuntimeIdentityV1;
}

export function createRuntimeFingerprint(identity: RuntimeIdentityV1): RuntimeFingerprintV1 {
  const genesis = as0x(identity.genesisHash);
  const meta = as0x(identity.metadataHash);
  const tuple = [
    RUNTIME_FINGERPRINT_DOMAIN,
    1,
    genesis,
    identity.specName,
    identity.specVersion,
    identity.transactionVersion,
    identity.stateVersion,
    identity.metadataVersion,
    meta,
  ];
  const encoded = JSON.stringify(tuple);
  const hash = sha256(new TextEncoder().encode(encoded));
  return {
    schemaVersion: 1,
    algorithm: "sha256",
    value: `0x${bytesToHex(hash)}`,
    identity: {
      genesisHash: genesis,
      specName: identity.specName,
      specVersion: identity.specVersion,
      transactionVersion: identity.transactionVersion,
      stateVersion: identity.stateVersion,
      metadataVersion: identity.metadataVersion,
      metadataHash: meta,
    },
  };
}

export function lowercaseHex(hex: string): `0x${string}` {
  return `0x${normalizeHex(hex)}`;
}
