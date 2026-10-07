import { SeamTransportError, parseH160 } from "@seam/core";
import type { JsonRpcClient } from "./rpc.js";
import { bytesToHex, hexToBytes } from "./scale.js";

export interface ReviveDryRun {
  weightConsumed: { refTime: string; proofSize: string } | null;
  weightRequired: { refTime: string; proofSize: string } | null;
  storageDeposit: string | null;
  maxStorageDeposit: string | null;
  gasConsumed: string | null;
  executionOk: boolean | null;
  returnData: `0x${string}` | null;
  revert: boolean;
  raw: unknown;
}

/**
 * Fallback uses state_call with ReviveApi_call as documented by Portaldot
 * when higher-level runtime API discovery cannot encode typed args.
 */
export async function reviveApiCallRaw(
  rpc: JsonRpcClient,
  encodedInputHex: `0x${string}`,
  at?: string,
): Promise<`0x${string}`> {
  try {
    const result = await rpc.call<string>("state_call", [
      "ReviveApi_call",
      encodedInputHex,
      ...(at ? [at] : []),
    ]);
    return result as `0x${string}`;
  } catch (e) {
    throw new SeamTransportError(e instanceof Error ? e.message : "ReviveApi_call failed");
  }
}

export async function reviveAccountId(
  rpc: JsonRpcClient,
  h160: string,
  at?: string,
): Promise<`0x${string}` | null> {
  parseH160(h160);
  try {
    const result = await rpc.call<string>("state_call", [
      "ReviveApi_accountId",
      h160,
      ...(at ? [at] : []),
    ]);
    return result as `0x${string}`;
  } catch {
    return null;
  }
}

export function interpretReviveDryRun(raw: unknown): ReviveDryRun {
  if (raw == null) {
    return {
      weightConsumed: null,
      weightRequired: null,
      storageDeposit: null,
      maxStorageDeposit: null,
      gasConsumed: null,
      executionOk: null,
      returnData: null,
      revert: false,
      raw,
    };
  }
  const obj = raw as Record<string, unknown>;
  const ok = typeof obj.Ok !== "undefined" || obj.result === "Ok" || obj.success === true;
  const err = typeof obj.Err !== "undefined" || obj.result === "Err" || obj.success === false;
  return {
    weightConsumed: null,
    weightRequired: null,
    storageDeposit: null,
    maxStorageDeposit: null,
    gasConsumed: null,
    executionOk: err ? false : ok ? true : null,
    returnData: typeof obj.data === "string" ? (obj.data as `0x${string}`) : null,
    revert: err,
    raw,
  };
}

export { bytesToHex, hexToBytes };
