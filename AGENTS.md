# AGENTS.md

SEAM is execution infrastructure for Portaldot V3.

Rules:

- TypeScript, pnpm, ESM, strict.
- `@seam/core` has no network and no wallets.
- Do not invent live capability support.
- Do not copy demonstration mnemonics from Portaldot samples.
- Runtime change after compile/preflight is a hard block.
- `unknown` never becomes executable.
- Prefer PAPI/direct RPC/SCALE. `@polkadot/api` is not used.
- Keep commits small and phase-aligned when possible.
- Update `docs/BUILD_STATE.md` with facts only.
