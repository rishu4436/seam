export const DEMO_MANIFEST = `{
  "seam": "1",
  "actions": [
    {
      "id": "mint-units",
      "capability": "assets.mint",
      "params": {
        "assetId": "1",
        "beneficiary": { "domain": "ss58", "value": "REPLACE_WITH_TESTNET_ACCOUNT" },
        "amount": "1000"
      }
    },
    {
      "id": "record-settlement",
      "capability": "revive.call",
      "params": {
        "dest": "0x0000000000000000000000000000000000000000",
        "value": "0",
        "data": "0x"
      }
    },
    {
      "id": "mint-receipt-nft",
      "capability": "nfts.mint",
      "params": {
        "collectionId": "1",
        "itemId": "1",
        "owner": { "domain": "ss58", "value": "REPLACE_WITH_TESTNET_ACCOUNT" }
      }
    }
  ]
}`;

export const SYNTHETIC_RUNTIME = {
  source: "synthetic_fixture" as const,
  chainName: "synthetic-portaldot",
  specName: "portaldot",
  specVersion: 1,
  genesisHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  metadataHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  fingerprint: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  note: "Synthetic Demo Mode — not live Portaldot evidence",
};
