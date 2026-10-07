import { useMemo, useState } from "react";
import {
  OPEN_HACKATHON_POLICY,
  compileExecutionPlan,
  createRuntimeLock,
  digestManifest,
  evaluateCapabilities,
  evaluatePolicy,
  evaluateRuntimeGuard,
  parseManifest,
  validateManifest,
  type RuntimeSnapshotV1,
} from "@seam/core";
import { DEMO_MANIFEST, SYNTHETIC_RUNTIME } from "./demo";

type View =
  | "landing"
  | "overview"
  | "runtime"
  | "manifest"
  | "plan"
  | "preflight"
  | "policy"
  | "execute"
  | "receipt"
  | "guard";

const syntheticSnapshot: RuntimeSnapshotV1 = {
  schemaVersion: 1,
  chainName: SYNTHETIC_RUNTIME.chainName,
  genesisHash: SYNTHETIC_RUNTIME.genesisHash as `0x${string}`,
  finalizedBlockHash: SYNTHETIC_RUNTIME.genesisHash as `0x${string}`,
  finalizedBlockNumber: 0,
  specName: "portaldot",
  specVersion: 1,
  transactionVersion: 1,
  stateVersion: 0,
  metadataVersion: 14,
  metadata: { hash: SYNTHETIC_RUNTIME.metadataHash as `0x${string}`, byteLength: 4 },
  pallets: [
    {
      pallet: "Assets",
      index: 50,
      calls: [
        { name: "mint", index: 3 },
        { name: "transfer", index: 8 },
      ],
    },
    { pallet: "Nfts", index: 71, calls: [{ name: "mint", index: 3 }] },
    { pallet: "Revive", index: 60, calls: [{ name: "call", index: 7 }] },
    { pallet: "Utility", index: 1, calls: [{ name: "batch_all", index: 2 }] },
  ],
  runtimeApis: [{ name: "ReviveApi", methods: ["call", "accountId"] }],
};

export function App() {
  const [view, setView] = useState<View>("landing");
  const [rpc, setRpc] = useState<"unavailable" | "synthetic">("unavailable");
  const [json, setJson] = useState(DEMO_MANIFEST);
  const [account, setAccount] = useState<string | null>(null);

  const issues = useMemo(() => {
    try {
      return validateManifest(JSON.parse(json));
    } catch {
      return [{ path: "", code: "JSON", message: "Invalid JSON", severity: "error" as const }];
    }
  }, [json]);

  const parsed = issues.length === 0 ? parseManifest(JSON.parse(json)) : null;
  const digest = parsed ? digestManifest(parsed) : null;
  const caps = evaluateCapabilities(rpc === "synthetic" ? syntheticSnapshot : null);
  const lock = createRuntimeLock({
    genesisHash: syntheticSnapshot.genesisHash,
    specName: syntheticSnapshot.specName,
    specVersion: syntheticSnapshot.specVersion,
    transactionVersion: syntheticSnapshot.transactionVersion,
    stateVersion: syntheticSnapshot.stateVersion,
    metadataVersion: syntheticSnapshot.metadataVersion,
    metadataHash: syntheticSnapshot.metadata.hash,
  });
  const plan = parsed
    ? compileExecutionPlan({
        manifest: parsed,
        lock,
        capabilities: caps,
        strategy: "atomic_unverified",
      })
    : null;
  const policy = plan ? evaluatePolicy(OPEN_HACKATHON_POLICY, plan) : null;
  const guard = evaluateRuntimeGuard({
    rpcAvailable: rpc === "synthetic",
    current:
      rpc === "synthetic"
        ? {
            genesisHash: syntheticSnapshot.genesisHash,
            specName: syntheticSnapshot.specName,
            specVersion: syntheticSnapshot.specVersion,
            transactionVersion: syntheticSnapshot.transactionVersion,
            stateVersion: syntheticSnapshot.stateVersion,
            metadataVersion: syntheticSnapshot.metadataVersion,
            metadataHash: syntheticSnapshot.metadata.hash,
          }
        : null,
    preparedLock: lock,
  });

  const nav: { id: View; label: string }[] = [
    { id: "landing", label: "Landing" },
    { id: "overview", label: "Overview" },
    { id: "runtime", label: "Runtime" },
    { id: "manifest", label: "Manifest Studio" },
    { id: "plan", label: "Execution Plan" },
    { id: "preflight", label: "Preflight" },
    { id: "policy", label: "Policy" },
    { id: "execute", label: "Execute" },
    { id: "receipt", label: "Receipt" },
    { id: "guard", label: "RuntimeGuard" },
  ];

  return (
    <div className="app">
      <nav className="nav">
        <h1>SEAM</h1>
        <p>One intent. Two execution worlds. One verified result.</p>
        {nav.map((n) => (
          <button
            key={n.id}
            className={view === n.id ? "active" : ""}
            onClick={() => setView(n.id)}
          >
            {n.label}
          </button>
        ))}
      </nav>
      <main className="main">
        {view === "landing" && (
          <section className="hero">
            <h2>
              SEAM
              <br />
              One intent.
              <br />
              Two execution worlds.
              <br />
              One verified result.
            </h2>
            <p className="tag">
              SEAM compiles, simulates, guards and verifies execution across Portaldot native
              runtime and Solidity/Revive. Hero atomic CrossVM batching is shown only when live
              evidence exists.
            </p>
            <div className="flow">
              {["Manifest", "Compile", "Preflight", "Policy", "Sign", "Execute", "Verify"].map(
                (x) => (
                  <span key={x}>{x}</span>
                ),
              )}
            </div>
            <div className="row">
              <button className="primary" onClick={() => setView("manifest")}>
                Open Manifest Studio
              </button>
              <button
                className="ghost"
                onClick={() => setRpc(rpc === "synthetic" ? "unavailable" : "synthetic")}
              >
                {rpc === "synthetic" ? "Disable synthetic demo" : "Enable Synthetic Demo Mode"}
              </button>
            </div>
          </section>
        )}
        {view === "overview" && (
          <div className="grid">
            <div className="card">
              <h3>RPC health</h3>
              <div className={`badge ${rpc === "unavailable" ? "bad" : "warn"}`}>
                {rpc === "unavailable" ? "RPC UNAVAILABLE" : "SYNTHETIC DEMO MODE"}
              </div>
            </div>
            <div className="card">
              <h3>Runtime fingerprint</h3>
              <code>{rpc === "synthetic" ? SYNTHETIC_RUNTIME.fingerprint : "unknown"}</code>
            </div>
            <div className="card">
              <h3>Capabilities</h3>
              <p>
                {caps.items.filter((i) => i.state === "observed").length} observed (source:{" "}
                {caps.evidenceSource})
              </p>
            </div>
            <div className="card">
              <h3>Recent receipts</h3>
              <p className="empty">No live receipts. Live execution requires wallet signature.</p>
            </div>
          </div>
        )}
        {view === "runtime" && (
          <div className="card">
            <h3>Runtime identity</h3>
            {rpc === "unavailable" ? (
              <p className="badge bad">RPC UNAVAILABLE</p>
            ) : (
              <pre>
                {JSON.stringify({ ...SYNTHETIC_RUNTIME, capabilities: caps.items }, null, 2)}
              </pre>
            )}
          </div>
        )}
        {view === "manifest" && (
          <>
            <div className="row">
              <button className="ghost" onClick={() => setJson(DEMO_MANIFEST)}>
                Load hero example
              </button>
              <button className="ghost" onClick={() => navigator.clipboard.writeText(json)}>
                Copy
              </button>
            </div>
            <textarea value={json} onChange={(e) => setJson(e.target.value)} />
            <div className="card" style={{ marginTop: 12 }}>
              <h3>Validation</h3>
              {issues.length === 0 ? (
                <p className="badge ok">valid · digest {digest?.value}</p>
              ) : (
                <pre>{JSON.stringify(issues, null, 2)}</pre>
              )}
            </div>
          </>
        )}
        {view === "plan" && plan && (
          <div>
            {plan.steps.map((s) => (
              <div className="step" key={s.actionId}>
                <div className={`surface ${s.surface}`}>{s.surface}</div>
                <div>
                  <strong>{s.actionId}</strong> · {s.capability} · {s.status}
                  <pre>
                    {JSON.stringify(
                      { target: s.target, params: s.normalizedParams, blockers: s.blockers },
                      null,
                      2,
                    )}
                  </pre>
                </div>
              </div>
            ))}
            <p className="badge warn">strategy: {plan.strategy} (atomicity not live-proven)</p>
          </div>
        )}
        {view === "preflight" && (
          <div className="card">
            <h3>Preflight</h3>
            {rpc === "unavailable" ? (
              <p className="badge bad">UNKNOWN — RPC UNAVAILABLE — execution blocked</p>
            ) : (
              <pre>
                {JSON.stringify(
                  {
                    lock: lock.fingerprint.value,
                    capabilities: caps.items.map((i) => `${i.capability}:${i.state}`),
                    weight: null,
                    storage: null,
                    fees: null,
                    atomicity: "atomic_unverified",
                    result: "block",
                    reason: "Live simulation not executed in console-only demo",
                  },
                  null,
                  2,
                )}
              </pre>
            )}
          </div>
        )}
        {view === "policy" && (
          <div className="card">
            <h3>Policy</h3>
            <pre>
              {JSON.stringify(policy ?? { result: "block", reasons: ["no plan"] }, null, 2)}
            </pre>
          </div>
        )}
        {view === "execute" && (
          <div className="card">
            <h3>External wallet</h3>
            <p>No seed phrase input. Connect a Substrate-compatible extension.</p>
            <div className="row">
              <button
                className="primary"
                onClick={async () => {
                  const w = window as unknown as {
                    injectedWeb3?: Record<
                      string,
                      {
                        enable: (
                          o: string,
                        ) => Promise<{ accounts: { get: () => Promise<{ address: string }[]> } }>;
                      }
                    >;
                  };
                  const provider = w.injectedWeb3 && Object.values(w.injectedWeb3)[0];
                  if (!provider) {
                    setAccount(null);
                    alert("No Substrate extension found");
                    return;
                  }
                  const enabled = await provider.enable("SEAM");
                  const accounts = await enabled.accounts.get();
                  setAccount(accounts[0]?.address ?? null);
                }}
              >
                Connect wallet
              </button>
            </div>
            <p>{account ?? "No account connected"}</p>
            <p className="empty">
              Exact payload is shown only after compile + preflight pass against live runtime.
            </p>
          </div>
        )}
        {view === "receipt" && (
          <div className="card">
            <h3>Receipt</h3>
            <p className="empty">No live receipt. Download appears after a finalized execution.</p>
            {digest && (
              <pre>{JSON.stringify({ manifestDigest: digest, overall: "unknown" }, null, 2)}</pre>
            )}
          </div>
        )}
        {view === "guard" && (
          <div className="card">
            <h3>RuntimeGuard</h3>
            <pre>{JSON.stringify(guard, null, 2)}</pre>
          </div>
        )}
      </main>
    </div>
  );
}
