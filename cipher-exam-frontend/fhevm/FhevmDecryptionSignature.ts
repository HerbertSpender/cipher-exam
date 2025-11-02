import { ethers } from "ethers";
import {
  EIP712Type,
  FhevmDecryptionSignatureType,
  FhevmInstance,
} from "./fhevmTypes";
import { GenericStringStorage } from "./GenericStringStorage";

function _timestampNow(): number {
  return Math.floor(Date.now() / 1000);
}

class FhevmDecryptionSignatureStorageKey {
  #contractAddresses: `0x${string}`[];
  #userAddress: `0x${string}`;
  #publicKey: string | undefined;
  #key: string;

  constructor(
    instance: FhevmInstance,
    contractAddresses: string[],
    userAddress: string,
    publicKey?: string
  ) {
    if (!ethers.isAddress(userAddress)) {
      throw new TypeError(`Invalid address ${userAddress}`);
    }

    const sortedContractAddresses = (
      contractAddresses as `0x${string}`[]
    ).sort();

    const emptyEIP712 = instance.createEIP712(
      publicKey ?? ethers.ZeroAddress,
      sortedContractAddresses,
      0,
      0
    );

    try {
      const hash = ethers.TypedDataEncoder.hash(
        emptyEIP712.domain,
        { UserDecryptRequestVerification: emptyEIP712.types.UserDecryptRequestVerification },
        emptyEIP712.message
      );

      this.#contractAddresses = sortedContractAddresses;
      this.#userAddress = userAddress as `0x${string}`;

      this.#key = `${userAddress}:${hash}`;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  get contractAddresses(): `0x${string}`[] {
    return this.#contractAddresses;
  }

  get userAddress(): `0x${string}` {
    return this.#userAddress;
  }

  get publicKey(): string | undefined {
    return this.#publicKey;
  }

  get key(): string {
    return this.#key;
  }
}

export class FhevmDecryptionSignature {
  #publicKey: string;
  #privateKey: string;
  #signature: string;
  #startTimestamp: number;
  #durationDays: number;
  #userAddress: `0x${string}`;
  #contractAddresses: `0x${string}`[];
  #eip712: EIP712Type;

  private constructor(parameters: FhevmDecryptionSignatureType) {
    if (!FhevmDecryptionSignature.checkIs(parameters)) {
      throw new TypeError("Invalid FhevmDecryptionSignatureType");
    }
    this.#publicKey = parameters.publicKey;
    this.#privateKey = parameters.privateKey;
    this.#signature = parameters.signature;
    this.#startTimestamp = parameters.startTimestamp;
    this.#durationDays = parameters.durationDays;
    this.#userAddress = parameters.userAddress;
    this.#contractAddresses = parameters.contractAddresses;
    this.#eip712 = parameters.eip712;
  }

  public get privateKey() {
    return this.#privateKey;
  }

  public get publicKey() {
    return this.#publicKey;
  }

  public get signature() {
    return this.#signature;
  }

  public get startTimestamp() {
    return this.#startTimestamp;
  }

  public get durationDays() {
    return this.#durationDays;
  }

  public get userAddress() {
    return this.#userAddress;
  }

  public get contractAddresses() {
    return this.#contractAddresses;
  }

  public get eip712() {
    return this.#eip712;
  }

  static checkIs(o: unknown): o is FhevmDecryptionSignatureType {
    if (typeof o !== "object" || o === null) {
      return false;
    }
    const p = o as Record<string, unknown>;
    return (
      typeof p.publicKey === "string" &&
      typeof p.privateKey === "string" &&
      typeof p.signature === "string" &&
      typeof p.startTimestamp === "number" &&
      typeof p.durationDays === "number" &&
      typeof p.userAddress === "string" &&
      Array.isArray(p.contractAddresses) &&
      typeof p.eip712 === "object" &&
      p.eip712 !== null
    );
  }

  static async loadFromGenericStringStorage(
    storage: GenericStringStorage,
    instance: FhevmInstance,
    contractAddresses: string[],
    userAddress: string,
    publicKey?: string
  ): Promise<FhevmDecryptionSignature | null> {
    const key = new FhevmDecryptionSignatureStorageKey(
      instance,
      contractAddresses,
      userAddress,
      publicKey
    );

    const stored = await storage.getItem(key.key);
    if (!stored) {
      return null;
    }

    try {
      const parsed = JSON.parse(stored);
      if (!FhevmDecryptionSignature.checkIs(parsed)) {
        return null;
      }
      return new FhevmDecryptionSignature(parsed);
    } catch {
      return null;
    }
  }

  static async saveToGenericStringStorage(
    storage: GenericStringStorage,
    instance: FhevmInstance,
    sig: FhevmDecryptionSignature
  ): Promise<void> {
    const key = new FhevmDecryptionSignatureStorageKey(
      instance,
      sig.contractAddresses,
      sig.userAddress,
      sig.publicKey
    );

    await storage.setItem(
      key.key,
      JSON.stringify({
        publicKey: sig.publicKey,
        privateKey: sig.privateKey,
        signature: sig.signature,
        startTimestamp: sig.startTimestamp,
        durationDays: sig.durationDays,
        userAddress: sig.userAddress,
        contractAddresses: sig.contractAddresses,
        eip712: sig.eip712,
      })
    );
  }

  static async new(
    instance: FhevmInstance,
    contractAddresses: string[],
    publicKey: string,
    privateKey: string,
    signer: ethers.Signer
  ): Promise<FhevmDecryptionSignature | null> {
    try {
      const userAddress = (await signer.getAddress()) as `0x${string}`;
      const startTimestamp = _timestampNow();
      const durationDays = 365;
      const eip712 = instance.createEIP712(
        publicKey,
        contractAddresses,
        startTimestamp,
        durationDays
      );
      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );
      return new FhevmDecryptionSignature({
        publicKey,
        privateKey,
        contractAddresses: contractAddresses as `0x${string}`[],
        startTimestamp,
        durationDays,
        signature,
        eip712: eip712 as EIP712Type,
        userAddress,
      });
    } catch {
      return null;
    }
  }

  static async loadOrSign(
    instance: FhevmInstance,
    contractAddresses: string[],
    signer: ethers.Signer,
    storage: GenericStringStorage,
    keyPair?: { publicKey: string; privateKey: string }
  ): Promise<FhevmDecryptionSignature | null> {
    const userAddress = (await signer.getAddress()) as `0x${string}`;

    // Try to load from cache first (with optional publicKey for matching)
    const cached: FhevmDecryptionSignature | null =
      await FhevmDecryptionSignature.loadFromGenericStringStorage(
        storage,
        instance,
        contractAddresses,
        userAddress,
        keyPair?.publicKey
      );

    if (cached) {
      return cached;
    }

    // Generate keypair if not provided
    // Use generateKeypair() which works in both mock and real modes
    const { publicKey, privateKey } = keyPair ?? instance.generateKeypair();

    const sig = await FhevmDecryptionSignature.new(
      instance,
      contractAddresses,
      publicKey,
      privateKey,
      signer
    );

    if (!sig) {
      return null;
    }

    await FhevmDecryptionSignature.saveToGenericStringStorage(
      storage,
      instance,
      sig
    );

    return sig;
  }
}

