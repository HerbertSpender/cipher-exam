"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Eip1193Provider, ethers } from "ethers";
import { useEip6963 } from "./useEip6963";
import { useInMemoryStorage } from "../useInMemoryStorage";

interface ProviderConnectInfo {
  readonly chainId: string;
}

interface ProviderRpcError extends Error {
  message: string;
  code: number;
  data?: unknown;
}

type ConnectListenerFn = (connectInfo: ProviderConnectInfo) => void;
type DisconnectListenerFn = (error: ProviderRpcError) => void;
type ChainChangedListenerFn = (chainId: string) => void;
type AccountsChangedListenerFn = (accounts: string[]) => void;

type Eip1193EventMap = {
  connect: ConnectListenerFn;
  chainChanged: ChainChangedListenerFn;
  accountsChanged: AccountsChangedListenerFn;
  disconnect: DisconnectListenerFn;
};

type Eip1193EventFn = <E extends keyof Eip1193EventMap>(
  event: E,
  fn: Eip1193EventMap[E]
) => void;

interface Eip1193ProviderWithEvent extends ethers.Eip1193Provider {
  on?: Eip1193EventFn;
  off?: Eip1193EventFn;
  addListener?: Eip1193EventFn;
  removeListener?: Eip1193EventFn;
}

export interface UseMetaMaskState {
  provider: Eip1193Provider | undefined;
  chainId: number | undefined;
  accounts: string[] | undefined;
  isConnected: boolean;
  error: Error | undefined;
  connect: () => void;
}

function useMetaMaskInternal(): UseMetaMaskState {
  const { storage } = useInMemoryStorage();
  const { error: eip6963Error, providers } = useEip6963();
  const [_currentProvider, _setCurrentProvider] = useState<
    Eip1193ProviderWithEvent | undefined
  >(undefined);
  const [chainId, _setChainId] = useState<number | undefined>(undefined);
  const [accounts, _setAccounts] = useState<string[] | undefined>(undefined);

  const connectListenerRef = useRef<ConnectListenerFn | undefined>(undefined);
  const disconnectListenerRef = useRef<DisconnectListenerFn | undefined>(
    undefined
  );
  const chainChangedListenerRef = useRef<ChainChangedListenerFn | undefined>(
    undefined
  );
  const accountsChangedListenerRef = useRef<
    AccountsChangedListenerFn | undefined
  >(undefined);

  const metaMaskProviderRef = useRef<Eip1193ProviderWithEvent | undefined>(
    undefined
  );

  const hasProvider = Boolean(_currentProvider);
  const hasAccounts = (accounts?.length ?? 0) > 0;
  const hasChain = typeof chainId === "number";

  const isConnected = hasProvider && hasAccounts && hasChain;

  // Persist wallet state
  const persistWalletState = useCallback(
    async (
      connectorId?: string,
      accountsArray?: string[],
      chainIdNum?: number,
      connected?: boolean
    ) => {
      if (connectorId !== undefined) {
        await storage.setItem("wallet.lastConnectorId", connectorId);
      }
      if (accountsArray !== undefined) {
        await storage.setItem(
          "wallet.lastAccounts",
          JSON.stringify(accountsArray)
        );
      }
      if (chainIdNum !== undefined) {
        await storage.setItem("wallet.lastChainId", String(chainIdNum));
      }
      if (connected !== undefined) {
        await storage.setItem("wallet.connected", String(connected));
      }
    },
    [storage]
  );

  // Load persisted wallet state
  const loadPersistedState = useCallback(async () => {
    const lastConnectorId = await storage.getItem("wallet.lastConnectorId");
    const lastAccountsStr = await storage.getItem("wallet.lastAccounts");
    const lastChainIdStr = await storage.getItem("wallet.lastChainId");
    const connectedStr = await storage.getItem("wallet.connected");

    return {
      lastConnectorId: lastConnectorId || null,
      lastAccounts: lastAccountsStr ? JSON.parse(lastAccountsStr) : null,
      lastChainId: lastChainIdStr ? Number.parseInt(lastChainIdStr, 10) : null,
      connected: connectedStr === "true",
    };
  }, [storage]);

  const connect = useCallback(() => {
    if (!_currentProvider) {
      return;
    }

    if (accounts && accounts.length > 0) {
      return;
    }

    // Prompt connection - only when user clicks Connect
    _currentProvider.request({ method: "eth_requestAccounts" });
  }, [_currentProvider, accounts]);

  useEffect(() => {
    let next: Eip1193ProviderWithEvent | undefined = undefined;

    // Try to restore from persisted state (EIP-6963 priority)
    const restoreProvider = async () => {
      const persisted = await loadPersistedState();
      if (persisted.lastConnectorId && persisted.connected) {
        // Find provider by UUID (if stored)
        for (let i = 0; i < providers.length; ++i) {
          if (providers[i].info.uuid === persisted.lastConnectorId) {
            next = providers[i].provider;
            break;
          }
        }
      }

      // Fallback to MetaMask by name
      if (!next) {
        for (let i = 0; i < providers.length; ++i) {
          if (providers[i].info.name.toLowerCase() === "metamask") {
            next = providers[i].provider;
            break;
          }
        }
      }

      return next;
    };

    const setupProvider = async () => {
      const restored = await restoreProvider();
      if (restored) {
        next = restored;
      } else if (providers.length > 0) {
        // Default to first provider
        next = providers[0].provider;
      }

      const prev = metaMaskProviderRef.current;
      if (prev === next) {
        return;
      }

      if (prev) {
        if (connectListenerRef.current) {
          prev.off?.("connect", connectListenerRef.current);
          prev.removeListener?.("connect", connectListenerRef.current);
          connectListenerRef.current = undefined;
        }
        if (disconnectListenerRef.current) {
          prev.off?.("disconnect", disconnectListenerRef.current);
          prev.removeListener?.("disconnect", disconnectListenerRef.current);
          disconnectListenerRef.current = undefined;
        }
        if (chainChangedListenerRef.current) {
          prev.off?.("chainChanged", chainChangedListenerRef.current);
          prev.removeListener?.("chainChanged", chainChangedListenerRef.current);
          chainChangedListenerRef.current = undefined;
        }
        if (accountsChangedListenerRef.current) {
          prev.off?.("accountsChanged", accountsChangedListenerRef.current);
          prev.removeListener?.(
            "accountsChanged",
            accountsChangedListenerRef.current
          );
          accountsChangedListenerRef.current = undefined;
        }
      }

      _setCurrentProvider(undefined);
      _setChainId(undefined);
      _setAccounts(undefined);

      metaMaskProviderRef.current = next;

      if (next) {
        // Connect listener
        const nextConnectListener = (connectInfo: ProviderConnectInfo) => {
          if (next !== metaMaskProviderRef.current) {
            return;
          }
          console.log(
            `[useMetaMask] on('connect') chainId=${connectInfo.chainId}`
          );
          const chainIdNum = Number.parseInt(connectInfo.chainId, 16);
          _setCurrentProvider(next);
          _setChainId(chainIdNum);
          persistWalletState(undefined, undefined, chainIdNum, true);
        };
        connectListenerRef.current = nextConnectListener;

        // Disconnect listener
        const nextDisconnectListener = (error: ProviderRpcError) => {
          if (next !== metaMaskProviderRef.current) {
            return;
          }
          console.log(`[useMetaMask] on('disconnect') error code=${error.code}`);
          _setCurrentProvider(undefined);
          _setChainId(undefined);
          _setAccounts(undefined);
          persistWalletState(undefined, [], undefined, false);
        };
        disconnectListenerRef.current = nextDisconnectListener;

        // ChainChanged listener
        const nextChainChangedListener = (chainId: string) => {
          if (next !== metaMaskProviderRef.current) {
            return;
          }
          console.log(`[useMetaMask] on('chainChanged') chainId=${chainId}`);
          const chainIdNum = Number.parseInt(chainId, 16);
          _setCurrentProvider(next);
          _setChainId(chainIdNum);
          persistWalletState(undefined, undefined, chainIdNum, undefined);
        };
        chainChangedListenerRef.current = nextChainChangedListener;

        // AccountsChanged listener
        const nextAccountsChangedListener = (accounts: string[]) => {
          if (next !== metaMaskProviderRef.current) {
            return;
          }
          console.log(
            `[useMetaMask] on('accountsChanged') accounts.length=${accounts.length}`
          );
          _setCurrentProvider(next);
          _setAccounts(accounts);
          persistWalletState(undefined, accounts, undefined, accounts.length > 0);
        };
        accountsChangedListenerRef.current = nextAccountsChangedListener;

        // Attach listeners
        if (next.on) {
          next.on("connect", nextConnectListener);
          next.on("disconnect", nextDisconnectListener);
          next.on("chainChanged", nextChainChangedListener);
          next.on?.("accountsChanged", nextAccountsChangedListener);
        } else {
          next.addListener?.("connect", nextConnectListener);
          next.addListener?.("disconnect", nextDisconnectListener);
          next.addListener?.("chainChanged", nextChainChangedListener);
          next.addListener?.("accountsChanged", nextAccountsChangedListener);
        }

        // Silent restore using eth_accounts only (not eth_requestAccounts)
        const updateChainId = async () => {
          if (next !== metaMaskProviderRef.current || !next) {
            return;
          }

          try {
            const [chainIdHex, accountsArray] = await Promise.all([
              next.request({ method: "eth_chainId" }),
              next.request({ method: "eth_accounts" }), // Silent restore
            ]);

            console.log(
              `[useMetaMask] connected to chainId=${chainIdHex} accounts.length=${accountsArray.length}`
            );

            const chainIdNum = Number.parseInt(chainIdHex, 16);
            _setCurrentProvider(next);
            _setChainId(chainIdNum);
            _setAccounts(accountsArray);

            // Persist state
            const providerUuid =
              providers.find((p) => p.provider === next)?.info.uuid;
            await persistWalletState(
              providerUuid,
              accountsArray,
              chainIdNum,
              accountsArray.length > 0
            );
          } catch {
            console.log(`[useMetaMask] not connected!`);
            _setCurrentProvider(next);
            _setChainId(undefined);
            _setAccounts(undefined);
          }
        };

        updateChainId();
      }
    };

    setupProvider();
  }, [providers, loadPersistedState, persistWalletState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const current = metaMaskProviderRef.current;

      if (current) {
        const chainChangedListener = chainChangedListenerRef.current;
        const accountsChangedListener = accountsChangedListenerRef.current;
        const connectListener = connectListenerRef.current;
        const disconnectListener = disconnectListenerRef.current;

        if (connectListener) {
          current.off?.("connect", connectListener);
          current.removeListener?.("connect", connectListener);
        }
        if (disconnectListener) {
          current.off?.("disconnect", disconnectListener);
          current.removeListener?.("disconnect", disconnectListener);
        }
        if (chainChangedListener) {
          current.off?.("chainChanged", chainChangedListener);
          current.removeListener?.("chainChanged", chainChangedListener);
        }
        if (accountsChangedListener) {
          current.off?.("accountsChanged", accountsChangedListener);
          current.removeListener?.("accountsChanged", accountsChangedListener);
        }
      }

      chainChangedListenerRef.current = undefined;
      metaMaskProviderRef.current = undefined;
    };
  }, []);

  return {
    provider: _currentProvider,
    chainId,
    accounts,
    isConnected,
    error: eip6963Error,
    connect,
  };
}

interface MetaMaskProviderProps {
  children: ReactNode;
}

const MetaMaskContext = createContext<UseMetaMaskState | undefined>(undefined);

export const MetaMaskProvider: React.FC<MetaMaskProviderProps> = ({
  children,
}) => {
  const { provider, chainId, accounts, isConnected, error, connect } =
    useMetaMaskInternal();
  return (
    <MetaMaskContext.Provider
      value={{
        provider,
        chainId,
        accounts,
        isConnected,
        error,
        connect,
      }}
    >
      {children}
    </MetaMaskContext.Provider>
  );
};

export function useMetaMask() {
  const context = useContext(MetaMaskContext);
  if (context === undefined) {
    throw new Error("useMetaMask must be used within a MetaMaskProvider");
  }
  return context;
}
