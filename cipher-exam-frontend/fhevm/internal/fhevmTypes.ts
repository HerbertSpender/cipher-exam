import type { FhevmInstance, FhevmInstanceConfig } from "../fhevmTypes";

export type FhevmInitSDKOptions = {
  tfheParams?: any;
  kmsParams?: any;
  thread?: number;
};

export type FhevmCreateInstanceType = () => Promise<FhevmInstance>;
export type FhevmInitSDKType = (
  options?: FhevmInitSDKOptions
) => Promise<boolean>;
export type FhevmLoadSDKType = () => Promise<void>;
export type IsFhevmSupportedType = (chainId: number) => boolean;

export type FhevmRelayerSDKType = {
  initSDK: FhevmInitSDKType;
  createInstance: (config: FhevmInstanceConfig) => Promise<FhevmInstance>;
  SepoliaConfig: FhevmInstanceConfig;
  __initialized__?: boolean;
};

export type FhevmWindowType = {
  relayerSDK: FhevmRelayerSDKType;
};

export function isFhevmRelayerSDKType(
  o: unknown,
  trace?: (message?: unknown, ...optionalParams: unknown[]) => void
): o is FhevmRelayerSDKType {
  if (typeof o === "undefined") {
    trace?.("relayerSDK is undefined");
    return false;
  }
  if (o === null) {
    trace?.("relayerSDK is null");
    return false;
  }
  if (typeof o !== "object") {
    trace?.("relayerSDK is not an object");
    return false;
  }
  const sdk = o as Record<string, unknown>;
  if (typeof sdk.initSDK !== "function") {
    trace?.("relayerSDK.initSDK is not a function");
    return false;
  }
  if (typeof sdk.createInstance !== "function") {
    trace?.("relayerSDK.createInstance is not a function");
    return false;
  }
  if (typeof sdk.SepoliaConfig !== "object") {
    trace?.("relayerSDK.SepoliaConfig is not an object");
    return false;
  }
  return true;
}

