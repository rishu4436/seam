export const PORTALDOT_DOCUMENTED = {
  substrateWss: "wss://testnetv3-node.feso-apps.xyz",
  evmRpc: "https://testnetv3-eth-rpc.feso-apps.xyz",
  chainId: 420420777,
  tokenSymbol: "tPOTv3",
  decimals: 14,
  explorer: "https://node-console.feso-apps.xyz/",
} as const;

export const DEFAULT_SUBSTRATE_RPC =
  process.env.SEAM_SUBSTRATE_RPC ?? PORTALDOT_DOCUMENTED.substrateWss;
export const DEFAULT_EVM_RPC = process.env.SEAM_EVM_RPC ?? PORTALDOT_DOCUMENTED.evmRpc;
