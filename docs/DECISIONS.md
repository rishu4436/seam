# Decisions

## D1. No `@polkadot/api`

New TypeScript integration uses JSON-RPC + SCALE helpers. Legacy API was not required for MVP discovery/submit.

## D2. Tri-state capabilities

`observed | not_observed | unknown`. Never `supported: boolean`.

## D3. Atomicity default

`ATOMICITY_PROVEN = false`. Utility.batch_all observation yields `atomic_unverified`, not `atomic_verified`.

## D4. Version 0.0.1 until live hero demo

Do not tag v0.1.0 without live evidence.

## D5. Call index honesty

Pallet indexes prefer metadata v14 decode. Call variant indexes may be FRAME-conventional until PortableRegistry variant names are fully decoded. Encoded bytes are inspectable; live metadata wins.

## D6. SS58 SCALE encoding

Native SCALE encoding of SS58 requires AccountId32 at the adapter boundary. Manifests may carry SS58; compilers should receive AccountId32 hex for exact bytes.
