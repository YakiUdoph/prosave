import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type SaveState = {
  panic: boolean;
  setPanic: (v: boolean) => void;
  connected: boolean;
  setConnected: (v: boolean) => void;
  intent: string;
  setIntent: (v: string) => void;
  selectedPlan: "A" | "B" | "C";
  setSelectedPlan: (v: "A" | "B" | "C") => void;
  walletAddress: string | null;
  chainId: number | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  error: string | null;
  setError: (err: string | null) => void;
};

const SaveContext = createContext<SaveState | null>(null);

export function SaveProvider({ children }: { children: ReactNode }) {
  const [panic, setPanicState] = useState(false);
  const [connected, setConnected] = useState(false);
  const [intent, setIntent] = useState("Get me $700 USDC. Don't sell my ETH unless necessary.");
  const [selectedPlan, setSelectedPlan] = useState<"A" | "B" | "C">("B");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setPanic = useCallback((v: boolean) => setPanicState(v), []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("panic", panic);
    return () => root.classList.remove("panic");
  }, [panic]);

  // Handle auto-connect and listeners
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const provider = (window as any).ethereum;
        try {
          const accounts = await provider.request({ method: "eth_accounts" });
          if (accounts && accounts.length > 0) {
            const chainIdHex = await provider.request({ method: "eth_chainId" });
            const currentChainId = parseInt(chainIdHex, 16);
            setWalletAddress(accounts[0]);
            setChainId(currentChainId);
            setConnected(true);

            // Listeners
            provider.on("accountsChanged", (newAccounts: string[]) => {
              if (newAccounts.length === 0) {
                setWalletAddress(null);
                setConnected(false);
              } else {
                setWalletAddress(newAccounts[0]);
              }
            });

            provider.on("chainChanged", (newChainIdHex: string) => {
              setChainId(parseInt(newChainIdHex, 16));
            });
          }
        } catch (err) {
          console.error("Auto-connect check failed:", err);
        }
      }
    };
    checkConnection();
  }, []);

  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
    setChainId(null);
    setConnected(false);
  }, []);

  const connectWallet = useCallback(async () => {
    setError(null);
    if (typeof window === "undefined" || !(window as any).ethereum) {
      throw new Error("No EVM wallet detected. Please install OKX Wallet or MetaMask.");
    }

    const provider = (window as any).ethereum;

    try {
      // Request accounts
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts returned from wallet.");
      }
      const address = accounts[0];

      // Get chain ID
      const chainIdHex = await provider.request({ method: "eth_chainId" });
      const currentChainId = parseInt(chainIdHex, 16);

      // X Layer Testnet is Chain ID 1952 (0x7A0)
      if (currentChainId !== 1952) {
        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x7A0" }],
          });
        } catch (switchError: any) {
          // If network doesn't exist, request adding it
          if (switchError.code === 4902 || switchError.message?.includes("Unrecognized chain ID")) {
            await provider.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0x7A0",
                  chainName: "X Layer Testnet",
                  nativeCurrency: {
                    name: "OKB",
                    symbol: "OKB",
                    decimals: 18,
                  },
                  rpcUrls: ["https://xlayertestrpc.okx.com"],
                  blockExplorerUrls: ["https://www.oklink.com/xlayer-test"],
                },
              ],
            });
          } else {
            throw switchError;
          }
        }
      }

      // Hook up listeners
      provider.on("accountsChanged", (newAccounts: string[]) => {
        if (newAccounts.length === 0) {
          disconnectWallet();
        } else {
          setWalletAddress(newAccounts[0]);
        }
      });

      provider.on("chainChanged", (newChainIdHex: string) => {
        setChainId(parseInt(newChainIdHex, 16));
      });

      setWalletAddress(address);
      setChainId(1952);
      setConnected(true);
    } catch (err: any) {
      const msg = err.message || "Failed to connect wallet";
      setError(msg);
      throw err;
    }
  }, [disconnectWallet]);

  const value = useMemo(
    () => ({
      panic,
      setPanic,
      connected,
      setConnected,
      intent,
      setIntent,
      selectedPlan,
      setSelectedPlan,
      walletAddress,
      chainId,
      connectWallet,
      disconnectWallet,
      error,
      setError,
    }),
    [panic, setPanic, connected, intent, selectedPlan, walletAddress, chainId, connectWallet, disconnectWallet, error],
  );

  return <SaveContext.Provider value={value}>{children}</SaveContext.Provider>;
}

export function useSave() {
  const ctx = useContext(SaveContext);
  if (!ctx) throw new Error("useSave must be used inside SaveProvider");
  return ctx;
}

