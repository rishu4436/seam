import type { ObservedEventV1, StepVerificationV1, VerificationStatus } from "./receipt.js";
import type { ExpectedOutcomeAssertionV1 } from "./prepare.js";

function hasEvent(events: ObservedEventV1[], pallet: string, method: string): boolean {
  return events.some(
    (e) =>
      e.pallet.toLowerCase() === pallet.toLowerCase() &&
      e.method.toLowerCase() === method.toLowerCase(),
  );
}

export function verifyStep(
  assertion: ExpectedOutcomeAssertionV1,
  events: ObservedEventV1[],
  dispatchSuccess: boolean | null,
): StepVerificationV1 {
  if (dispatchSuccess === false) {
    return { actionId: assertion.actionId, status: "failed", notes: ["Dispatch failed"] };
  }
  if (dispatchSuccess === null) {
    return { actionId: assertion.actionId, status: "unknown", notes: ["Dispatch success unknown"] };
  }
  switch (assertion.kind) {
    case "assets.transfer":
      return {
        actionId: assertion.actionId,
        status: hasEvent(events, "Assets", "Transferred") ? "verified" : "unknown",
        notes: hasEvent(events, "Assets", "Transferred")
          ? ["Assets.Transferred observed"]
          : ["Assets.Transferred not observed in captured events"],
      };
    case "assets.mint":
      return {
        actionId: assertion.actionId,
        status: hasEvent(events, "Assets", "Issued") ? "verified" : "unknown",
        notes: hasEvent(events, "Assets", "Issued")
          ? ["Assets.Issued observed"]
          : ["Assets.Issued not observed in captured events"],
      };
    case "nfts.mint":
      return {
        actionId: assertion.actionId,
        status: hasEvent(events, "Nfts", "Issued") ? "verified" : "unknown",
        notes: hasEvent(events, "Nfts", "Issued")
          ? ["Nfts.Issued observed"]
          : ["Nfts.Issued not observed in captured events"],
      };
    case "revive.call": {
      const ok =
        hasEvent(events, "Revive", "ContractEmitted") ||
        hasEvent(events, "Revive", "Executed") ||
        hasEvent(events, "System", "ExtrinsicSuccess");
      const status: VerificationStatus = ok ? "verified" : "unknown";
      return {
        actionId: assertion.actionId,
        status,
        notes: ok
          ? ["Revive execution event or extrinsic success observed"]
          : ["Revive-specific event not observed"],
      };
    }
    default:
      return {
        actionId: assertion.actionId,
        status: "unknown",
        notes: ["No verifier for capability"],
      };
  }
}
