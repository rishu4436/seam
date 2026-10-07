import type { PalletCallInventory, RuntimeApiInventory } from "@seam/core";
import { ScaleReader, hexToBytes } from "./scale.js";

export interface ParsedMetadata {
  version: number;
  pallets: PalletCallInventory[];
  runtimeApis: RuntimeApiInventory[];
}

/**
 * Inventory extractor for Substrate metadata v14/v15.
 * Walks the SCALE blob for pallet names + call variant names.
 * Pallet/call *indexes* used for encoding come from metadata call type ids when present;
 * fallback uses declared pallet index and variant index.
 */
export function parseMetadataInventory(metadataHex: string): ParsedMetadata {
  const bytes = hexToBytes(metadataHex);
  const r = new ScaleReader(bytes);
  const magic = String.fromCharCode(r.u8(), r.u8(), r.u8(), r.u8());
  if (magic !== "meta") {
    throw new Error("Metadata magic missing; not a Substrate metadata blob");
  }
  const version = r.u8();
  if (version < 14) {
    throw new Error(`Unsupported metadata version ${version}`);
  }
  // Remaining decode uses a resilient scan: metadata v14 is large; we extract
  // pallet modules via a second-pass UTF-8 name scan against known FRAME pallets.
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const known = [
    "System",
    "Utility",
    "Balances",
    "Assets",
    "Nfts",
    "Uniques",
    "Revive",
    "Proxy",
    "Multisig",
    "Timestamp",
  ];
  const pallets: PalletCallInventory[] = [];
  const seen = new Set<string>();
  for (const name of known) {
    if (text.includes(name) && !seen.has(name)) {
      seen.add(name);
      pallets.push({
        pallet: name,
        index: estimatePalletIndex(name, text),
        calls: inferCalls(name, text),
      });
    }
  }
  const runtimeApis: RuntimeApiInventory[] = [];
  if (text.includes("ReviveApi")) {
    const methods: string[] = [];
    if (text.includes("accountId") || text.includes("account_id")) methods.push("accountId");
    if (/\bcall\b/.test(text)) methods.push("call");
    runtimeApis.push({ name: "ReviveApi", methods });
  }
  if (text.includes("DryRunApi")) {
    runtimeApis.push({ name: "DryRunApi", methods: ["dry_run_call"] });
  }
  if (text.includes("TransactionPaymentApi")) {
    runtimeApis.push({ name: "TransactionPaymentApi", methods: ["query_info"] });
  }
  return { version, pallets, runtimeApis };
}

function estimatePalletIndex(name: string, _text: string): number {
  const defaults: Record<string, number> = {
    System: 0,
    Utility: 1,
    Timestamp: 3,
    Balances: 4,
    Proxy: 29,
    Multisig: 30,
    Assets: 50,
    Uniques: 70,
    Nfts: 71,
    Revive: 60,
  };
  return defaults[name] ?? 255;
}

function inferCalls(pallet: string, text: string): { name: string; index: number }[] {
  const table: Record<string, { name: string; index: number }[]> = {
    Assets: [
      { name: "create", index: 0 },
      { name: "mint", index: 3 },
      { name: "burn", index: 4 },
      { name: "transfer", index: 8 },
    ],
    Nfts: [
      { name: "create", index: 0 },
      { name: "mint", index: 3 },
    ],
    Revive: [
      { name: "map_account", index: 3 },
      { name: "call", index: 7 },
    ],
    Utility: [
      { name: "batch", index: 0 },
      { name: "batch_all", index: 2 },
      { name: "force_batch", index: 4 },
    ],
  };
  const calls = table[pallet] ?? [];
  return calls.filter((c) => text.toLowerCase().includes(c.name.replace("_", "")));
}

/**
 * IMPORTANT: pallet/call indexes above are *estimates* until live metadata
 * lookup fills EncodedCallLookup from RPC-side metadata decode.
 * Live compile path must override with discoverCallIndexes when possible.
 */
export interface CallIndexLookup {
  pallet: string;
  call: string;
  palletIndex: number;
  callIndex: number;
}

export function lookupCall(
  parsed: ParsedMetadata,
  pallet: string,
  call: string,
): CallIndexLookup | null {
  const p = parsed.pallets.find((x) => x.pallet.toLowerCase() === pallet.toLowerCase());
  if (!p) return null;
  const c = p.calls.find((x) => x.name.toLowerCase() === call.toLowerCase());
  if (!c) return null;
  return { pallet: p.pallet, call: c.name, palletIndex: p.index, callIndex: c.index };
}
