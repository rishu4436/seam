import { ScaleReader } from "./scale.js";
import type { PalletCallInventory, RuntimeApiInventory } from "@seam/core";

function skipTypeDef(r: ScaleReader) {
  const kind = r.u8();
  switch (kind) {
    case 0: {
      // Composite
      const n = Number(r.compact());
      for (let i = 0; i < n; i++) {
        const name = r.u8();
        if (name === 1) r.str();
        r.compact(); // type id
        const docs = Number(r.compact());
        for (let d = 0; d < docs; d++) r.str();
      }
      break;
    }
    case 1: {
      // Variant
      const n = Number(r.compact());
      for (let i = 0; i < n; i++) {
        r.str(); // name
        const fields = Number(r.compact());
        for (let f = 0; f < fields; f++) {
          if (r.u8() === 1) r.str();
          r.compact();
          const docs = Number(r.compact());
          for (let d = 0; d < docs; d++) r.str();
        }
        r.u8(); // index
        const docs = Number(r.compact());
        for (let d = 0; d < docs; d++) r.str();
      }
      break;
    }
    case 2: // Sequence
      r.compact();
      break;
    case 3: // Array
      r.u32();
      r.compact();
      break;
    case 4: {
      // Tuple
      const n = Number(r.compact());
      for (let i = 0; i < n; i++) r.compact();
      break;
    }
    case 5: // Primitive
      r.u8();
      break;
    case 6: // Compact
      r.compact();
      break;
    case 7: // BitSequence
      r.compact();
      r.compact();
      break;
    default:
      throw new Error(`Unknown TypeDef ${kind}`);
  }
}

function skipPortableRegistry(r: ScaleReader) {
  const n = Number(r.compact());
  for (let i = 0; i < n; i++) {
    r.compact(); // id
    const pathN = Number(r.compact());
    for (let p = 0; p < pathN; p++) r.str();
    const paramN = Number(r.compact());
    for (let p = 0; p < paramN; p++) {
      r.str();
      if (r.u8() === 1) r.compact();
    }
    skipTypeDef(r);
    const docs = Number(r.compact());
    for (let d = 0; d < docs; d++) r.str();
  }
}

export interface VariantCall {
  name: string;
  index: number;
}

export function parseV14Pallets(bytes: Uint8Array): {
  version: number;
  pallets: PalletCallInventory[];
  runtimeApis: RuntimeApiInventory[];
} {
  const r = new ScaleReader(bytes);
  const magic = String.fromCharCode(r.u8(), r.u8(), r.u8(), r.u8());
  if (magic !== "meta") throw new Error("bad metadata magic");
  const version = r.u8();
  if (version < 14) throw new Error(`metadata v${version} unsupported`);
  skipPortableRegistry(r);
  const palletN = Number(r.compact());
  const pallets: PalletCallInventory[] = [];
  for (let i = 0; i < palletN; i++) {
    const name = r.str();
    const hasCalls = r.u8() === 1;
    let calls: { name: string; index: number }[] = [];
    if (hasCalls) {
      r.compact(); // calls type id — variant names require registry; store type id as synthetic
      // We cannot list variant names without the registry. Keep empty names here;
      // discovery layer merges string-scan fallback for names.
      calls = [];
    }
    if (r.u8() === 1) r.compact(); // storage
    const hasConstants = Number(r.compact());
    for (let c = 0; c < hasConstants; c++) {
      r.str();
      r.compact();
      r.bytes();
      const docs = Number(r.compact());
      for (let d = 0; d < docs; d++) r.str();
    }
    if (r.u8() === 1) r.compact(); // event
    const errOpt = r.u8();
    if (errOpt === 1) r.compact();
    const index = r.u8();
    const docs = Number(r.compact());
    for (let d = 0; d < docs; d++) r.str();
    pallets.push({ pallet: name, index, calls });
  }
  return { version, pallets, runtimeApis: [] };
}
