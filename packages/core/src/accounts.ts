const H160_RE = /^0x[0-9a-fA-F]{40}$/;
const ACCOUNTID32_HEX_RE = /^0x[0-9a-fA-F]{64}$/;

export interface H160 {
  readonly domain: "h160";
  readonly bytes: Uint8Array;
  readonly hex: `0x${string}`;
}

export interface AccountId32 {
  readonly domain: "accountId32";
  readonly bytes: Uint8Array;
  readonly hex: `0x${string}`;
}

export interface Ss58Address {
  readonly domain: "ss58";
  readonly value: string;
}

export function parseH160(input: string): H160 {
  if (!H160_RE.test(input)) {
    throw new Error("Invalid H160: expected 0x + 40 hex characters");
  }
  const hex = input.toLowerCase() as `0x${string}`;
  const bytes = new Uint8Array(20);
  for (let i = 0; i < 20; i++) {
    bytes[i] = Number.parseInt(hex.slice(2 + i * 2, 4 + i * 2), 16);
  }
  return { domain: "h160", bytes, hex };
}

export function parseAccountId32Hex(input: string): AccountId32 {
  if (!ACCOUNTID32_HEX_RE.test(input)) {
    throw new Error("Invalid AccountId32 hex: expected 0x + 64 hex characters");
  }
  const hex = input.toLowerCase() as `0x${string}`;
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = Number.parseInt(hex.slice(2 + i * 2, 4 + i * 2), 16);
  }
  return { domain: "accountId32", bytes, hex };
}

export function parseSs58(input: string): Ss58Address {
  if (typeof input !== "string" || input.length < 4) {
    throw new Error("Invalid SS58");
  }
  return { domain: "ss58", value: input };
}

/** Mapping H160 → AccountId32 is a runtime API concern; this module never infers it. */
export type AccountMappingBoundary = {
  from: H160;
  to: AccountId32;
  source: "reviveApi.accountId";
};
