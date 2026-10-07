import type { JsonObject } from "@seam/core";
import { ScaleWriter, bytesToHex, hexToBytes } from "./scale.js";
import type { CallIndexLookup } from "./metadata.js";

function uintToBigInt(s: string): bigint {
  if (!/^(0|[1-9][0-9]*)$/.test(s)) throw new Error("Invalid uint string");
  return BigInt(s);
}

function encodeAccount(writer: ScaleWriter, addr: JsonObject) {
  const domain = addr.domain;
  const value = String(addr.value);
  if (domain === "accountId32Hex") {
    writer.u8(0); // MultiAddress::Id
    writer.raw(hexToBytes(value));
    return;
  }
  if (domain === "ss58") {
    // SS58 payload is not decoded here without checksum library.
    // Compiler requires accountId32Hex for SCALE until SS58 codec is wired.
    throw new Error("SS58 encoding requires AccountId32 conversion at the adapter boundary");
  }
  throw new Error("Unsupported address domain for native encoding");
}

export function encodeNativeCall(
  lookup: CallIndexLookup,
  capability: string,
  params: JsonObject,
): `0x${string}` {
  const w = new ScaleWriter();
  w.u8(lookup.palletIndex);
  w.u8(lookup.callIndex);
  switch (capability) {
    case "assets.transfer":
    case "assets.mint": {
      w.compact(uintToBigInt(String(params.assetId)));
      encodeAccount(
        w,
        (capability === "assets.transfer" ? params.target : params.beneficiary) as JsonObject,
      );
      w.compact(uintToBigInt(String(params.amount)));
      break;
    }
    case "nfts.mint": {
      w.compact(uintToBigInt(String(params.collectionId)));
      w.compact(uintToBigInt(String(params.itemId)));
      encodeAccount(w, params.owner as JsonObject);
      // witness Option::None
      w.u8(0);
      break;
    }
    case "revive.call": {
      w.raw(hexToBytes(String(params.dest)));
      w.compact(uintToBigInt(String(params.value)));
      // weight V2 { ref_time, proof_size } as compact pair if provided
      const ref = String(params.weightRefTime ?? "0");
      const proof = String(params.weightProofSize ?? "0");
      w.compact(uintToBigInt(ref));
      w.compact(uintToBigInt(proof));
      const storage = params.storageDepositLimit;
      if (storage == null) w.u8(0);
      else {
        w.u8(1);
        w.compact(uintToBigInt(String(storage)));
      }
      w.bytes(hexToBytes(String(params.data)));
      break;
    }
    default:
      throw new Error(`No SCALE encoder for ${capability}`);
  }
  return bytesToHex(w.toBytes());
}

export function encodeBatchAll(utility: CallIndexLookup, innerCalls: Uint8Array[]): `0x${string}` {
  const w = new ScaleWriter();
  w.u8(utility.palletIndex);
  w.u8(utility.callIndex);
  w.compact(innerCalls.length);
  for (const c of innerCalls) w.raw(c);
  return bytesToHex(w.toBytes());
}
