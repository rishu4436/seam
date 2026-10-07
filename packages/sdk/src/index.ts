import {
  OPEN_HACKATHON_POLICY,
  buildPreflightReport,
  checkRuntimeLock,
  digestManifest,
  evaluateCapabilities,
  evaluatePolicy,
  evaluateRuntimeGuard,
  identityFromSnapshot,
  parseManifest,
  prepareExecution,
  summarizeCoverage,
  validateManifest,
  verifyStep,
  type ExecutionPolicyV1,
  type ExecutionReceiptV1,
  type PreparedExecutionV1,
  type SeamManifestV1,
  type SubstrateSigner,
} from "@seam/core";
import {
  ATOMICITY_PROVEN,
  compilePortaldotPlan,
  createRpc,
  DEFAULT_SUBSTRATE_RPC,
  discoverPortaldot,
  submitSignedExtrinsic,
  waitFinalized,
} from "@seam/portaldot";

export * from "@seam/core";
export {
  discoverPortaldot,
  compilePortaldotPlan,
  DEFAULT_SUBSTRATE_RPC,
  ATOMICITY_PROVEN,
} from "@seam/portaldot";

export async function inspectRuntime(rpcUrl = DEFAULT_SUBSTRATE_RPC) {
  const discovery = await discoverPortaldot(rpcUrl);
  const capabilities = evaluateCapabilities(discovery.snapshot);
  const identity = identityFromSnapshot(discovery.snapshot);
  return { discovery, capabilities, identity };
}

export function parse(input: unknown): SeamManifestV1 {
  return parseManifest(input);
}

export function digest(input: unknown) {
  return digestManifest(input);
}

export async function compileManifest(input: unknown, rpcUrl = DEFAULT_SUBSTRATE_RPC) {
  const { discovery, capabilities } = await inspectRuntime(rpcUrl);
  const plan = compilePortaldotPlan({
    manifest: input,
    snapshot: discovery.snapshot,
    capabilities,
    metadataHex: discovery.metadataHex,
  });
  return { plan, discovery, capabilities };
}

export async function preflight(input: unknown, rpcUrl = DEFAULT_SUBSTRATE_RPC) {
  const compiled = await compileManifest(input, rpcUrl);
  const report = buildPreflightReport({
    plan: compiled.plan,
    currentIdentity: identityFromSnapshot(compiled.discovery.snapshot),
    capabilities: compiled.capabilities,
    warnings: ATOMICITY_PROVEN
      ? []
      : ["CrossVM atomicity is not live-proven; strategy is truthful"],
  });
  return { ...compiled, preflight: report };
}

export async function policyCheck(
  input: unknown,
  policy: ExecutionPolicyV1 = OPEN_HACKATHON_POLICY,
  rpcUrl = DEFAULT_SUBSTRATE_RPC,
) {
  const pf = await preflight(input, rpcUrl);
  const decision = evaluatePolicy(policy, pf.plan);
  return { ...pf, policy: decision };
}

export async function prepare(
  input: unknown,
  policy: ExecutionPolicyV1 = OPEN_HACKATHON_POLICY,
  rpcUrl = DEFAULT_SUBSTRATE_RPC,
) {
  const checked = await policyCheck(input, policy, rpcUrl);
  const prepared = prepareExecution({
    plan: checked.plan,
    preflight: checked.preflight,
    policy: checked.policy,
    currentIdentity: identityFromSnapshot(checked.discovery.snapshot),
    callPayloadHex: checked.plan.steps[0]?.encodedCallHex ?? null,
  });
  return { ...checked, prepared };
}

export async function submitExecution(args: {
  prepared: PreparedExecutionV1;
  signer: SubstrateSigner;
  address: string;
  rpcUrl?: string;
}): Promise<ExecutionReceiptV1> {
  const rpcUrl = args.rpcUrl ?? DEFAULT_SUBSTRATE_RPC;
  const live = await inspectRuntime(rpcUrl);
  const lock = checkRuntimeLock(args.prepared.runtimeLock, live.identity);
  if (lock.state !== "match" || args.prepared.blocked || !args.prepared.callPayloadHex) {
    return {
      schemaVersion: 1,
      manifestDigest: args.prepared.manifestDigest,
      executionPlanDigest: args.prepared.executionPlanDigest,
      compilerVersion: "0.0.1",
      runtimeFingerprint: args.prepared.runtimeLock.fingerprint,
      runtimeLock: args.prepared.runtimeLock,
      policy: {
        schemaVersion: 1,
        result: "block",
        reasons: [{ code: "BLOCK", message: "submission blocked" }],
        requireHumanApproval: true,
      },
      strategy: "unavailable",
      signerAddress: args.address,
      extrinsicHash: null,
      blockHash: null,
      blockNumber: null,
      extrinsicIndex: null,
      finalized: false,
      dispatchSuccess: null,
      dispatchError: "blocked before submit",
      events: [],
      expectedSteps: [],
      coverage: { verifiedSteps: 0, failedSteps: 0, unknownSteps: 0, notes: "blocked" },
      overall: "failed",
      observation: { capturedAtIso: new Date().toISOString() },
    };
  }
  const signed = await args.signer.signPayload(args.prepared.callPayloadHex, args.address);
  const rpc = await createRpc(rpcUrl);
  try {
    const submitted = await submitSignedExtrinsic(
      rpc,
      args.prepared,
      signed.signedHex,
      live.identity,
    );
    const fin = submitted.extrinsicHash
      ? await waitFinalized(rpc, submitted.extrinsicHash)
      : submitted;
    const steps = args.prepared.expectedOutcomes.map((a) => verifyStep(a, fin.events, fin.success));
    const cov = summarizeCoverage(steps);
    return {
      schemaVersion: 1,
      manifestDigest: args.prepared.manifestDigest,
      executionPlanDigest: args.prepared.executionPlanDigest,
      compilerVersion: "0.0.1",
      runtimeFingerprint: args.prepared.runtimeLock.fingerprint,
      runtimeLock: args.prepared.runtimeLock,
      policy: { schemaVersion: 1, result: "pass", reasons: [], requireHumanApproval: true },
      strategy: "sequential",
      signerAddress: args.address,
      extrinsicHash: fin.extrinsicHash,
      blockHash: fin.blockHash,
      blockNumber: fin.blockNumber,
      extrinsicIndex: fin.extrinsicIndex,
      finalized: fin.finalized,
      dispatchSuccess: fin.success,
      dispatchError: fin.dispatchError,
      events: fin.events,
      expectedSteps: steps,
      coverage: cov,
      overall: cov.overall,
      observation: { capturedAtIso: fin.observedAtIso },
    };
  } finally {
    await rpc.close();
  }
}

export function runtimeGuardFor(
  prepared: PreparedExecutionV1,
  current: Awaited<ReturnType<typeof inspectRuntime>> | null,
) {
  return evaluateRuntimeGuard({
    rpcAvailable: current != null,
    current: current?.identity ?? null,
    preparedLock: prepared.runtimeLock,
    currentSnapshot: current?.discovery.snapshot ?? null,
  });
}

export { validateManifest, parseManifest, digestManifest };
