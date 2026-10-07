export class ScaleWriter {
  private chunks: number[] = [];
  u8(n: number) {
    this.chunks.push(n & 0xff);
  }
  u16(n: number) {
    this.u8(n);
    this.u8(n >> 8);
  }
  u32(n: number) {
    this.u8(n);
    this.u8(n >> 8);
    this.u8(n >> 16);
    this.u8(n >> 24);
  }
  compact(n: bigint | number) {
    const x = typeof n === "number" ? BigInt(n) : n;
    if (x < 64n) {
      this.u8(Number(x) << 2);
    } else if (x < 16384n) {
      const v = Number(x << 2n) + 1;
      this.u8(v);
      this.u8(v >> 8);
    } else if (x < 1_073_741_824n) {
      const v = Number(x << 2n) + 2;
      this.u32(v);
    } else {
      const bytes: number[] = [];
      let y = x;
      while (y > 0n) {
        bytes.push(Number(y & 0xffn));
        y >>= 8n;
      }
      this.u8(((bytes.length - 4) << 2) | 0b11);
      for (const b of bytes) this.u8(b);
    }
  }
  bytes(data: Uint8Array) {
    this.compact(data.length);
    for (const b of data) this.u8(b);
  }
  raw(data: Uint8Array) {
    for (const b of data) this.u8(b);
  }
  bool(v: boolean) {
    this.u8(v ? 1 : 0);
  }
  toBytes(): Uint8Array {
    return Uint8Array.from(this.chunks);
  }
}

export class ScaleReader {
  constructor(
    private readonly data: Uint8Array,
    public offset = 0,
  ) {}
  u8(): number {
    const v = this.data[this.offset++];
    if (v === undefined) throw new Error("SCALE underflow");
    return v;
  }
  u16(): number {
    return this.u8() | (this.u8() << 8);
  }
  u32(): number {
    return this.u8() | (this.u8() << 8) | (this.u8() << 16) | (this.u8() << 24);
  }
  compact(): bigint {
    const first = this.u8();
    const mode = first & 0b11;
    if (mode === 0) return BigInt(first >> 2);
    if (mode === 1) return BigInt((first | (this.u8() << 8)) >> 2);
    if (mode === 2) {
      const b2 = this.u8();
      const b3 = this.u8();
      const b4 = this.u8();
      return BigInt((first | (b2 << 8) | (b3 << 16) | (b4 << 24)) >>> 2);
    }
    const len = (first >> 2) + 4;
    let n = 0n;
    for (let i = 0; i < len; i++) {
      n |= BigInt(this.u8()) << (8n * BigInt(i));
    }
    return n;
  }
  bytes(): Uint8Array {
    const len = Number(this.compact());
    const slice = this.data.slice(this.offset, this.offset + len);
    this.offset += len;
    return slice;
  }
  str(): string {
    return new TextDecoder().decode(this.bytes());
  }
  bool(): boolean {
    return this.u8() === 1;
  }
}

export function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToHex(bytes: Uint8Array): `0x${string}` {
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
