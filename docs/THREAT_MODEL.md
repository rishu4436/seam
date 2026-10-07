# Threat model

| Threat                    | Status                                                                   |
| ------------------------- | ------------------------------------------------------------------------ |
| Malicious RPC             | partially mitigated (evidence hashing, lock; RPC can still lie)          |
| Stale RPC                 | partially mitigated (finalized pin + lock recheck)                       |
| Runtime upgrade           | mitigated (lock mismatch blocks)                                         |
| Forged snapshot           | partially mitigated (metadata hash bind; does not prove honest RPC)      |
| Tampered lock             | mitigated (recompute fingerprint)                                        |
| Tampered Manifest         | mitigated (digest)                                                       |
| Stale prepared tx         | mitigated (lock recheck before sign/submit)                              |
| Malicious params          | partially mitigated (schemas, policy)                                    |
| Unsafe address conversion | mitigated (explicit domains, no magic conversion)                        |
| Signature theft           | not mitigated (user environment)                                         |
| Secret leakage            | mitigated in product (no mnemonic API); ops still user-owned             |
| Partial execution         | partially mitigated (strategy truthfulness)                              |
| False atomicity           | mitigated (never claim verified without proof)                           |
| Compromised adapter       | not mitigated                                                            |
| Unsupported metadata      | fail closed / unknown                                                    |
| Replay                    | partially mitigated (runtime identity bind; no full nonce framework yet) |
| Misleading UI             | partially mitigated (RPC UNAVAILABLE, synthetic banner)                  |
