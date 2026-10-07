import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex } from "@noble/hashes/utils";
import { canonicalize } from "./canonical.js";
import type { JsonValue } from "./json.js";
import type { SeamManifestV1 } from "./manifest.js";
import { parseManifest } from "./manifest.js";

export const MANIFEST_DIGEST_DOMAIN = "SEAM_MANIFEST_V1";
export const COMPILER_VERSION = "0.0.1";

export interface ManifestDigestV1 {
  schemaVersion: 1;
  algorithm: "sha256";
  value: `0x${string}`;
}

export function digestManifest(input: SeamManifestV1 | unknown): ManifestDigestV1 {
  const manifest = parseManifest(input);
  const payload = {
    domain: MANIFEST_DIGEST_DOMAIN,
    schemaVersion: 1,
    manifest,
  };
  const encoded = canonicalize(JSON.parse(JSON.stringify(payload)) as JsonValue);
  const hash = sha256(new TextEncoder().encode(encoded));
  return {
    schemaVersion: 1,
    algorithm: "sha256",
    value: `0x${bytesToHex(hash)}`,
  };
}

export interface ExecutionPlanDigestV1 {
  schemaVersion: 1;
  algorithm: "sha256";
  value: `0x${string}`;
}

export function digestCanonicalObject(domain: string, value: unknown): ExecutionPlanDigestV1 {
  const encoded = canonicalize({
    domain,
    schemaVersion: 1,
    value: JSON.parse(JSON.stringify(value)),
  });
  const hash = sha256(new TextEncoder().encode(encoded));
  return {
    schemaVersion: 1,
    algorithm: "sha256",
    value: `0x${bytesToHex(hash)}`,
  };
}
