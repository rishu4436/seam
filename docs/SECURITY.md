# Security

Signing: compile → preflight → policy → prepare exact payload → **external** sign → submit.

SEAM is not a key custodian. Tests use mock signers.

Unknown values are never serialized as zero.

Receipt “verified” means coverage match, not chain-wide proof.

Do not commit secrets. Official demo mnemonics must never be copied here.
