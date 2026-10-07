# Manifest V1

`SEAM_MANIFEST_VERSION = "1"`

```json
{
  "seam": "1",
  "actions": [{ "id": "payment", "capability": "assets.transfer", "params": {} }]
}
```

Root: plain object, exact `seam: "1"`, non-empty `actions`, reject unknown fields.

Action: `id`, `capability`, `params` only.

IDs: non-empty strings, exact uniqueness, no silent trimming.

Capability: opaque string. Validator does not understand chain semantics.

Params: JSON object. Reject undefined, BigInt, NaN, Infinity, functions, symbols, Date, Map, Set, class instances, cycles, accessors.

APIs: `validateManifest`, `parseManifest`, `ManifestValidationError`. Input is never mutated.
