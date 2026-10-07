# Judge guide (< 5 minutes)

1. Problem: Portaldot has native + Revive; developers coordinate them by hand.
2. SEAM: one Manifest → runtime-bound CrossVM execution.
3. Runtime discovery (`seam inspect`) or console Runtime (RPC UNAVAILABLE is truthful).
4. Capability evidence (observed / not_observed / unknown).
5. Runtime Fingerprint.
6. Manifest Studio — `examples/manifests/crossvm-settlement.json`.
7. Plan: Native → Revive → Native.
8. Preflight (unknown/block if no live sim).
9. Policy pass/block.
10. Execute requires extension wallet — no seeds.
11. Receipt types ready; live tx pending wallet.
12. Failure manifest `crossvm-settlement-revert.json`.
13. Runtime upgrade block: synthetic test in `@seam/core` (`lock.test.ts`).
