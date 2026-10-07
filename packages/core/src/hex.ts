export function normalizeHex(value: string): string {
  const v = value.startsWith("0x") || value.startsWith("0X") ? value.slice(2) : value;
  return v.toLowerCase();
}

export function as0x(hex: string): `0x${string}` {
  return `0x${normalizeHex(hex)}`;
}

export function sha256HexBytes(bytes: Uint8Array): `0x${string}` {
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
