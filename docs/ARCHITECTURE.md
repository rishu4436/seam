# Architecture

SEAM is a pipeline, not a wallet and not a marketplace.

Concepts (separate):

1. **Manifest** — requested intent
2. **Runtime Discovery** — live metadata at one finalized head
3. **Compiler** — runtime-bound execution plan
4. **Preflight** — can this exact plan proceed
5. **Policy** — may it proceed
6. **Execution** — external sign + submit
7. **Receipt** — observed vs expected within verifier coverage

Package boundaries match the monorepo: core is pure; portaldot talks to chain; sdk orchestrates; cli/console are interfaces.

A runtime change is an explicit state transition. After mismatch: rediscover → recompile → re-preflight → re-policy → new signature.
