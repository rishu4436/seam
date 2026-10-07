import {
  hashMetadataBytes,
  type ObservationMetadataV1,
  type RuntimeSnapshotV1,
  SeamTransportError,
} from "@seam/core";
import { createRpc } from "./rpc.js";
import { DEFAULT_SUBSTRATE_RPC } from "./config.js";
import { parseMetadataInventory } from "./metadata.js";
import { parseV14Pallets } from "./metadata-v14.js";
import { hexToBytes as hx } from "./scale.js";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

export interface DiscoveryResult {
  snapshot: RuntimeSnapshotV1;
  metadataHex: `0x${string}`;
  observation: ObservationMetadataV1;
}

interface RuntimeVersion {
  specName: string;
  specVersion: number;
  transactionVersion: number;
  stateVersion?: number;
  implName?: string;
}

export async function discoverPortaldot(rpcUrl = DEFAULT_SUBSTRATE_RPC): Promise<DiscoveryResult> {
  let client;
  try {
    client = await createRpc(rpcUrl);
  } catch (e) {
    throw new SeamTransportError(e instanceof Error ? e.message : "RPC connect failed", { rpcUrl });
  }
  try {
    const finalized = await client.call<string>("chain_getFinalizedHead");
    const header = await client.call<{ number: string }>("chain_getHeader", [finalized]);
    const chainName = await client.call<string>("system_chain");
    const genesis = await client.call<string>("chain_getBlockHash", [0]);
    const version = await client.call<RuntimeVersion>("state_getRuntimeVersion", [finalized]);
    const metadataHex = await client.call<`0x${string}`>("state_getMetadata", [finalized]);
    const metadataBytes = hx(metadataHex);
    const hash = hashMetadataBytes(metadataBytes);
    let inventory = parseMetadataInventory(metadataHex);
    try {
      const v14 = parseV14Pallets(metadataBytes);
      const byName = new Map(inventory.pallets.map((p) => [p.pallet.toLowerCase(), p]));
      inventory = {
        version: v14.version,
        pallets: v14.pallets.map((p) => {
          const extra = byName.get(p.pallet.toLowerCase());
          return {
            pallet: p.pallet,
            index: p.index,
            calls: extra?.calls ?? p.calls,
          };
        }),
        runtimeApis: inventory.runtimeApis,
      };
    } catch {
      // keep string-scan inventory; v14 skip failed
    }
    const snapshot: RuntimeSnapshotV1 = {
      schemaVersion: 1,
      chainName,
      genesisHash: genesis as `0x${string}`,
      finalizedBlockHash: finalized as `0x${string}`,
      finalizedBlockNumber: Number.parseInt(header.number, 16),
      specName: version.specName,
      specVersion: version.specVersion,
      transactionVersion: version.transactionVersion,
      stateVersion: version.stateVersion ?? null,
      metadataVersion: inventory.version,
      metadata: { hash, byteLength: metadataBytes.length },
      pallets: inventory.pallets.sort((a, b) => a.pallet.localeCompare(b.pallet)),
      runtimeApis: inventory.runtimeApis.sort((a, b) => a.name.localeCompare(b.name)),
    };
    return {
      snapshot,
      metadataHex,
      observation: {
        observedAtIso: new Date().toISOString(),
        rpcUrl,
        transport: rpcUrl.startsWith("ws") ? "ws" : "http",
        source: "live",
      },
    };
  } finally {
    await client.close();
  }
}

export async function writeSnapshot(
  result: DiscoveryResult,
  root = "snapshots/portaldot",
): Promise<string> {
  const dir = path.join(
    root,
    result.snapshot.genesisHash.slice(2, 18),
    `${result.snapshot.specVersion}-${result.snapshot.metadata.hash.slice(2, 18)}`,
  );
  await mkdir(dir, { recursive: true });
  const snapPath = path.join(dir, "snapshot.json");
  try {
    const existing = await readFile(snapPath, "utf8");
    if (existing && existing !== JSON.stringify(result.snapshot, null, 2) + "\n") {
      throw new Error("Refusing to overwrite differing historical snapshot evidence");
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  await writeFile(snapPath, JSON.stringify(result.snapshot, null, 2) + "\n");
  await writeFile(path.join(dir, "metadata.scale.hex"), result.metadataHex);
  await writeFile(
    path.join(dir, "observation.json"),
    JSON.stringify(result.observation, null, 2) + "\n",
  );
  return dir;
}
