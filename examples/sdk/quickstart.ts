import { digest, parse } from "@seam/sdk";

const manifest = parse({
  seam: "1",
  actions: [{ id: "demo", capability: "assets.transfer", params: { assetId: "1" } }],
});

console.log(digest(manifest));
