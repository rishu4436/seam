export interface SubstrateSignerAccount {
  address: string;
  name?: string;
  source: string;
}

export interface SignedPayloadV1 {
  signatureHex: `0x${string}`;
  signedHex: `0x${string}`;
  signerAddress: string;
}

export interface SubstrateSigner {
  readonly kind: "substrate";
  accounts(): Promise<SubstrateSignerAccount[]>;
  signPayload(payloadHex: `0x${string}`, address: string): Promise<SignedPayloadV1>;
}

export class MockSigner implements SubstrateSigner {
  readonly kind = "substrate" as const;
  constructor(private readonly address = "5MockSignerAccountForTestsOnly111111111111111") {}
  async accounts(): Promise<SubstrateSignerAccount[]> {
    return [{ address: this.address, name: "mock", source: "mock" }];
  }
  async signPayload(payloadHex: `0x${string}`, address: string): Promise<SignedPayloadV1> {
    return {
      signatureHex: "0x00",
      signedHex: payloadHex,
      signerAddress: address,
    };
  }
}
