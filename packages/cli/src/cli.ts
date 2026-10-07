#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import {
  OPEN_HACKATHON_POLICY,
  buildPreflightReport,
  createRuntimeFingerprint,
  digestManifest,
  evaluateCapabilities,
  evaluatePolicy,
  identityFromSnapshot,
  parseManifest,
  prepareExecution,
  validateManifest,
} from "@seam/core";
import { compilePortaldotPlan, discoverPortaldot, writeSnapshot } from "@seam/portaldot";

function banner() {
  console.log("SEAM — CrossVM execution control plane  |  default posture: READ / DRY-RUN");
}

async function loadJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, "utf8"));
}

async function inspect() {
  try {
    const d = await discoverPortaldot();
    const caps = evaluateCapabilities(d.snapshot);
    const fp = createRuntimeFingerprint(identityFromSnapshot(d.snapshot));
    console.log(
      JSON.stringify({ snapshot: d.snapshot, fingerprint: fp, capabilities: caps }, null, 2),
    );
  } catch (e) {
    console.error("RPC UNAVAILABLE");
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 2;
  }
}

async function capabilities() {
  try {
    const d = await discoverPortaldot();
    console.log(JSON.stringify(evaluateCapabilities(d.snapshot), null, 2));
  } catch (e) {
    console.error("RPC UNAVAILABLE — all capabilities unknown");
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 2;
  }
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  banner();
  if (!cmd || cmd === "help") {
    console.log(`
Commands:
  seam inspect
  seam capabilities
  seam validate <manifest>
  seam digest <manifest>
  seam compile <manifest>
  seam preflight <manifest>
  seam policy <manifest>
  seam prepare <manifest>
  seam execute <manifest>     (EXPLICIT — not default)
  seam receipt <receipt.json>
  seam runtime diff <a.json> <b.json>
  seam discover --write
`);
    return;
  }
  switch (cmd) {
    case "inspect":
      await inspect();
      return;
    case "capabilities":
      await capabilities();
      return;
    case "validate": {
      const m = await loadJson(rest[0]!);
      const issues = validateManifest(m);
      console.log(JSON.stringify(issues, null, 2));
      if (issues.length) process.exitCode = 1;
      return;
    }
    case "digest": {
      const m = parseManifest(await loadJson(rest[0]!));
      console.log(JSON.stringify(digestManifest(m), null, 2));
      return;
    }
    case "compile":
    case "preflight":
    case "policy":
    case "prepare": {
      const manifest = await loadJson(rest[0]!);
      try {
        const d = await discoverPortaldot();
        const caps = evaluateCapabilities(d.snapshot);
        const plan = compilePortaldotPlan({
          manifest,
          snapshot: d.snapshot,
          capabilities: caps,
          metadataHex: d.metadataHex,
        });
        if (cmd === "compile") {
          console.log(JSON.stringify(plan, null, 2));
          return;
        }
        const pf = buildPreflightReport({
          plan,
          currentIdentity: identityFromSnapshot(d.snapshot),
          capabilities: caps,
        });
        if (cmd === "preflight") {
          console.log(JSON.stringify(pf, null, 2));
          return;
        }
        const pol = evaluatePolicy(OPEN_HACKATHON_POLICY, plan);
        if (cmd === "policy") {
          console.log(JSON.stringify(pol, null, 2));
          return;
        }
        const prepared = prepareExecution({
          plan,
          preflight: pf,
          policy: pol,
          currentIdentity: identityFromSnapshot(d.snapshot),
          callPayloadHex: plan.steps[0]?.encodedCallHex ?? null,
        });
        console.log(JSON.stringify(prepared, null, 2));
      } catch (e) {
        console.error("RPC UNAVAILABLE — cannot compile against live runtime");
        console.error(e instanceof Error ? e.message : e);
        process.exitCode = 2;
      }
      return;
    }
    case "execute": {
      console.error(
        "Execution is explicit and requires an external signer. Use the console or SDK submitExecution.",
      );
      process.exitCode = 1;
      return;
    }
    case "receipt": {
      const r = await loadJson(rest[0]!);
      console.log(JSON.stringify(r, null, 2));
      return;
    }
    case "runtime": {
      if (rest[0] !== "diff") {
        console.error("usage: seam runtime diff <a> <b>");
        process.exitCode = 1;
        return;
      }
      const a = await loadJson(rest[1]!);
      const b = await loadJson(rest[2]!);
      console.log(JSON.stringify({ a, b, note: "Compare specVersion and metadata.hash" }, null, 2));
      return;
    }
    case "discover": {
      const write = rest.includes("--write");
      try {
        const d = await discoverPortaldot();
        if (write) {
          const dir = await writeSnapshot(d);
          console.log(`wrote ${dir}`);
        } else {
          console.log(JSON.stringify(d.snapshot, null, 2));
        }
      } catch (e) {
        console.error("RPC UNAVAILABLE");
        console.error(e instanceof Error ? e.message : e);
        process.exitCode = 2;
      }
      return;
    }
    default:
      console.error(`Unknown command ${cmd}`);
      process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
