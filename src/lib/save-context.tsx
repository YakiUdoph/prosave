import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getAssetIdentity, scanPortfolio, type ScannedAsset, type DataSource, publicClient } from "./xlayer";
import { parseSaveIntent, type SaveIntent } from "./intent-parser";
import { solveRescue, type RescueResult } from "./rescue-solver";
import type { QuoteReference } from "./rescue-solver";
import { normalizeFallbackReason, serverGetReadOnlyQuoteReferences, type QuoteRequest } from "./market-intelligence.server";
import { simulatePlan, type ExecutionState, type SimulationResult } from "./simulation";
import {
  type ExecutionStep,
  type ExecutionSession,
  type WalletVerificationSession,
  buildXLayerWalletVerificationTransaction,
  confirmWalletVerification,
  getWalletVerificationAction,
  validateWalletVerificationPreconditions,
  requestWalletSignatureAndBroadcast,
} from "./execution";

export type PortfolioMode = "LIVE_WALLET" | "WATCH_ONLY" | "DEMO_PORTFOLIO";

export interface EIP6963ProviderDetail {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  provider: any;
}

type SaveState = {
  panic: boolean;
  setPanic: (v: boolean) => void;
  connected: boolean;
  setConnected: (v: boolean) => void;
  intent: string;
  setIntent: (v: string) => void;
  parsedIntent: SaveIntent;
  rescueResult: RescueResult;
  marketDataStatus: "LOADING" | "READY" | "FALLBACK";
  selectedPlan: "A" | "B" | "C";
  setSelectedPlan: (v: "A" | "B" | "C") => void;
  walletAddress: string | null;
  scannedAddress: string | null;
  scanWatchOnlyAddress: (address: string) => void;
  chainId: number | null;
  walletDetected: boolean;
  connectWallet: (customProvider?: any, preservePortfolioMode?: boolean) => Promise<void>;
  disconnectWallet: () => void;
  error: string | null;
  setError: (err: string | null) => void;
  portfolio: ScannedAsset[];
  rpcStatus: "online" | "offline";
  totalPortfolioValue: number;
  isScanning: boolean;
  scanWalletPortfolio: () => Promise<void>;
  portfolioMode: PortfolioMode;
  setPortfolioMode: (v: PortfolioMode) => void;
  
  // Step 7 states
  executionState: ExecutionState;
  setExecutionState: (v: ExecutionState) => void;
  simulationResult: SimulationResult | null;
  quoteTimestamp: number;
  setQuoteTimestamp: (v: number) => void;
  runSimulation: (mode: "DEMO_SIMULATION" | "LIVE_SIMULATION") => Promise<void>;
  resetSimulation: () => void;

  // Step 8 states
  executionSession: ExecutionSession;
  setExecutionSession: React.Dispatch<React.SetStateAction<ExecutionSession>>;
  startExecution: () => Promise<void>;
  walletVerification: WalletVerificationSession;
  verifyWalletOnXLayer: () => Promise<void>;
  resetWalletVerification: () => void;
  walletVerificationBalanceStatus: "UNKNOWN" | "CHECKING" | "SUFFICIENT" | "INSUFFICIENT" | "ERROR";

  // Wallet Connectivity Additions
  detectedWallets: EIP6963ProviderDetail[];
  isOkxWalletInstalled: boolean;
  connectWalletConnect: () => Promise<void>;
};

const SaveContext = createContext<SaveState | null>(null);

export function SaveProvider({ children }: { children: ReactNode }) {
  const [panic, setPanicState] = useState(false);
  const [connected, setConnected] = useState(false);
  const [intent, setIntentState] = useState("");
  const [parsedIntent, setParsedIntent] = useState<SaveIntent>(() =>
    parseSaveIntent("")
  );
  const [selectedPlan, setSelectedPlan] = useState<"A" | "B" | "C">("B");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletDetected, setWalletDetected] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Discovered wallet states
  const [detectedWallets, setDetectedWallets] = useState<EIP6963ProviderDetail[]>([]);
  const [isOkxWalletInstalled, setIsOkxWalletInstalled] = useState(false);
  const [activeProvider, setActiveProvider] = useState<any>(null);

  // Portfolio states
  const [portfolioMode, setPortfolioModeState] = useState<PortfolioMode>("DEMO_PORTFOLIO");
  const [scannedAddress, setScannedAddress] = useState<string | null>(null);
  const [livePortfolio, setLivePortfolio] = useState<ScannedAsset[]>([]);
  const [watchOnlyPortfolio, setWatchOnlyPortfolio] = useState<ScannedAsset[]>([]);
  const [demoPortfolio, setDemoPortfolio] = useState<ScannedAsset[]>([]);
  const [liveTotalValue, setLiveTotalValue] = useState<number>(0);
  const [watchOnlyTotalValue, setWatchOnlyTotalValue] = useState<number>(0);
  const [demoTotalValue, setDemoTotalValue] = useState<number>(0);
  const [liveRpcStatus, setLiveRpcStatus] = useState<"online" | "offline">("offline");
  const [watchOnlyRpcStatus, setWatchOnlyRpcStatus] = useState<"online" | "offline">("offline");

  const portfolio = useMemo(() => {
    if (portfolioMode === "LIVE_WALLET") return livePortfolio;
    if (portfolioMode === "WATCH_ONLY") return watchOnlyPortfolio;
    return demoPortfolio;
  }, [portfolioMode, livePortfolio, watchOnlyPortfolio, demoPortfolio]);

  const totalPortfolioValue = useMemo(() => {
    if (portfolioMode === "LIVE_WALLET") return liveTotalValue;
    if (portfolioMode === "WATCH_ONLY") return watchOnlyTotalValue;
    return demoTotalValue;
  }, [portfolioMode, liveTotalValue, watchOnlyTotalValue, demoTotalValue]);

  const rpcStatus = useMemo(() => {
    if (portfolioMode === "LIVE_WALLET") return liveRpcStatus;
    if (portfolioMode === "WATCH_ONLY") return watchOnlyRpcStatus;
    return "online";
  }, [portfolioMode, liveRpcStatus, watchOnlyRpcStatus]);

  // Step 7 Simulation States
  const [executionState, setExecutionState] = useState<ExecutionState>("IDLE");
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [quoteTimestamp, setQuoteTimestamp] = useState<number>(Date.now());

  // Step 8 Execution Session State
  const [executionSession, setExecutionSession] = useState<ExecutionSession>(() => ({
    mode: "DEMO_SIMULATION",
    state: "READY_TO_SIGN",
    steps: [],
    currentStepIndex: 0,
    targetAmount: 700,
    securedAmount: 180, // starting USDC
    confirmedTransactions: [],
  }));
  const [walletVerification, setWalletVerification] = useState<WalletVerificationSession>({
    state: "NOT_PERFORMED",
  });
  const [walletVerificationBalanceStatus, setWalletVerificationBalanceStatus] = useState<"UNKNOWN" | "CHECKING" | "SUFFICIENT" | "INSUFFICIENT" | "ERROR">("UNKNOWN");

  const [quoteReferences, setQuoteReferences] = useState<QuoteReference[]>([]);
  const [marketDataStatus, setMarketDataStatus] = useState<"LOADING" | "READY" | "FALLBACK">("FALLBACK");

  useEffect(() => {
    let cancelled = false;
    const targetSymbol = parsedIntent.targetAsset || "USDC";
    const target = portfolio.find((asset) =>
      asset.symbol === targetSymbol && asset.mainnetReferenceChainIndex === 196 && asset.mainnetReferenceAddress
    );
    const requests: QuoteRequest[] = target ? portfolio
      .filter((asset) => asset.symbol !== targetSymbol && asset.mainnetReferenceChainIndex === 196 && asset.mainnetReferenceAddress)
      .map((asset) => ({
        assetKey: `196:${asset.mainnetReferenceAddress!.toLowerCase()}`,
        chainIndex: 196,
        fromTokenAddress: asset.mainnetReferenceAddress!,
        fromDecimals: asset.mainnetReferenceDecimals ?? 18,
        toTokenAddress: target.mainnetReferenceAddress!,
        amount: parseFloat(asset.balance),
      })) : [];

    if (requests.length === 0) {
      setQuoteReferences([]);
      setMarketDataStatus("FALLBACK");
      return () => { cancelled = true; };
    }
    setMarketDataStatus("LOADING");
    void serverGetReadOnlyQuoteReferences({ data: requests })
      .then(async (references) => {
        if (cancelled) return;
        let combined = references;
        for (let iteration = 0; iteration < 5; iteration++) {
          const preliminary = solveRescue(portfolio, parsedIntent, portfolioMode, { references: combined });
          const exactRequestMap = new Map<string, QuoteRequest>();
          for (const action of preliminary.plans.flatMap((plan) => plan.actions)) {
            const asset = portfolio.find((candidate) => getAssetIdentity(candidate) === action.assetId);
            if (!asset?.mainnetReferenceAddress || asset.mainnetReferenceChainIndex !== 196 || !target?.mainnetReferenceAddress) continue;
            const exactRequest: QuoteRequest = {
              assetKey: getAssetIdentity(asset), chainIndex: 196,
              fromTokenAddress: asset.mainnetReferenceAddress,
              fromDecimals: asset.mainnetReferenceDecimals ?? 18,
              toTokenAddress: target.mainnetReferenceAddress,
              amount: action.sellAmount,
            };
            exactRequestMap.set(`${exactRequest.assetKey}:${exactRequest.amount.toPrecision(15)}`, exactRequest);
          }
          const missing = [...exactRequestMap.values()].filter((request) =>
            !combined.some((reference) => reference.assetKey === request.assetKey && Math.abs(reference.requestedAmount - request.amount) < 1e-9)
          );
          if (missing.length === 0) break;
          const attempted = await serverGetReadOnlyQuoteReferences({ data: missing });
          combined = [...attempted, ...combined];
          if (cancelled) return;
        }
        setQuoteReferences(combined);
        setMarketDataStatus(combined.some((reference) => reference.quote) ? "READY" : "FALLBACK");
      })
      .catch(() => {
        if (cancelled) return;
        setQuoteReferences(requests.map((request) => ({ assetKey: request.assetKey, requestedAmount: request.amount, fallbackReason: normalizeFallbackReason() })));
        setMarketDataStatus("FALLBACK");
      });
    return () => { cancelled = true; };
  }, [portfolio, parsedIntent, portfolioMode]);

  const rescueResult = useMemo(() => {
    return solveRescue(portfolio, parsedIntent, portfolioMode, { references: quoteReferences });
  }, [portfolio, parsedIntent, portfolioMode, quoteReferences]);
  
  const [isScanning, setIsScanning] = useState(false);

  const setPanic = useCallback((v: boolean) => setPanicState(v), []);

  const setPortfolioMode = useCallback((mode: PortfolioMode) => {
    setPortfolioModeState(mode);
  }, []);

  const scanWatchOnlyAddress = useCallback((address: string) => {
    setScannedAddress(address);
    setPortfolioModeState("WATCH_ONLY");
  }, []);

  const setIntent = useCallback((v: string) => {
    setIntentState(v);
    setParsedIntent(parseSaveIntent(v));
  }, []);

  // Update quote timestamp when solver inputs recalculate
  useEffect(() => {
    setQuoteTimestamp(Date.now());
    setExecutionState("IDLE");
    setSimulationResult(null);
  }, [portfolio, parsedIntent, selectedPlan, quoteReferences]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("panic", panic);
    return () => root.classList.remove("panic");
  }, [panic]);

  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
    setScannedAddress(null);
    setChainId(null);
    setConnected(false);
    setExecutionState("IDLE");
    setSimulationResult(null);
    setWalletVerification({ state: "NOT_PERFORMED" });
    setPortfolioModeState("DEMO_PORTFOLIO");
  }, []);

  const scanWalletPortfolio = useCallback(async () => {
    setIsScanning(true);
    try {
      const addressToScan = portfolioMode === "WATCH_ONLY" ? scannedAddress : walletAddress;
      if (!addressToScan) {
        setIsScanning(false);
        return;
      }
      const result = await scanPortfolio(addressToScan);
      if (portfolioMode === "WATCH_ONLY") {
        setWatchOnlyPortfolio(result.assets);
        setWatchOnlyRpcStatus(result.rpcStatus);
        setWatchOnlyTotalValue(result.totalValue);
      } else {
        setLivePortfolio(result.assets);
        setLiveRpcStatus(result.rpcStatus);
        setLiveTotalValue(result.totalValue);
      }
    } catch (err: any) {
      console.error("X Layer portfolio scan failed:", err);
    } finally {
      setIsScanning(false);
    }
  }, [walletAddress, scannedAddress, portfolioMode]);

  // Handle EIP-6963 provider announcements and check OKX wallet installation
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ((window as any).ethereum) {
      setWalletDetected(true);
    }
    if ((window as any).okxwallet) {
      setIsOkxWalletInstalled(true);
    }

    const handleAnnounce = (event: any) => {
      const detail = event.detail as EIP6963ProviderDetail;
      if (detail.info.rdns === "com.okex.wallet") {
        setIsOkxWalletInstalled(true);
      }
      setDetectedWallets((prev) => {
        if (prev.some((w) => w.info.uuid === detail.info.uuid)) return prev;
        return [...prev, detail];
      });
    };

    window.addEventListener("eip6963:announceProvider" as any, handleAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    // Load baseline demo portfolio initially
    const initBaseline = async () => {
      const result = await scanPortfolio(null);
      setDemoPortfolio(result.assets);
      setDemoTotalValue(result.totalValue);
    };
    initBaseline();

    return () => {
      window.removeEventListener("eip6963:announceProvider" as any, handleAnnounce);
    };
  }, []);

  // Automatically scan portfolio when wallet address or scanned address changes
  useEffect(() => {
    if (portfolioMode === "LIVE_WALLET" && walletAddress) {
      scanWalletPortfolio();
    } else if (portfolioMode === "WATCH_ONLY" && scannedAddress) {
      scanWalletPortfolio();
    }
  }, [walletAddress, scannedAddress, portfolioMode, scanWalletPortfolio]);

  const connectWallet = useCallback(async (customProvider?: any, preservePortfolioMode = false) => {
    setError(null);
    let provider = customProvider;
    if (!provider) {
      if (typeof window === "undefined") {
        throw new Error("Cannot connect wallet in server environment.");
      }
      // Prefer OKX injected provider if available, otherwise check window.ethereum
      if ((window as any).okxwallet) {
        provider = (window as any).okxwallet;
      } else if ((window as any).ethereum) {
        provider = (window as any).ethereum;
      } else {
        throw new Error("No EVM wallet detected. Please install OKX Wallet or MetaMask.");
      }
    }

    try {
      // Explicit account request flow (wallet_requestPermissions with eth_accounts, fallback to eth_requestAccounts)
      let accounts: string[] = [];
      try {
        const permissions = await provider.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
        if (permissions) {
          accounts = await provider.request({ method: "eth_accounts" });
        }
      } catch (permError) {
        // Fallback to eth_requestAccounts
        accounts = await provider.request({ method: "eth_requestAccounts" });
      }

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
      setActiveProvider(provider);
      if (!preservePortfolioMode) {
        setPortfolioModeState("LIVE_WALLET");
      }
    } catch (err: any) {
      const msg = err.message || "Failed to connect wallet";
      setError(msg);
      throw err;
    }
  }, [disconnectWallet]);

  useEffect(() => {
    let cancelled = false;
    if (!connected || !walletAddress || chainId !== 1952) {
      setWalletVerificationBalanceStatus("UNKNOWN");
      return;
    }

    setWalletVerificationBalanceStatus("CHECKING");
    publicClient.getBalance({ address: walletAddress as `0x${string}` })
      .then((balance) => {
        if (!cancelled) {
          setWalletVerificationBalanceStatus(balance > 1_000_000_000_000_000n ? "SUFFICIENT" : "INSUFFICIENT");
        }
      })
      .catch(() => {
        if (!cancelled) setWalletVerificationBalanceStatus("ERROR");
      });

    return () => {
      cancelled = true;
    };
  }, [connected, walletAddress, chainId]);

  const connectWalletConnect = useCallback(async () => {
    setError(null);
    try {
      const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string;
      if (!projectId) {
        throw new Error("WalletConnect Project ID is missing. Add VITE_WALLETCONNECT_PROJECT_ID to .env to configure.");
      }
      const EthereumProvider = (await import("@walletconnect/ethereum-provider")).EthereumProvider;
      
      const provider = await EthereumProvider.init({
        projectId,
        showQrModal: true,
        qrModalOptions: {
          themeMode: "dark",
        },
        optionalChains: [1952],
        chains: [1], // Init chain required
        optionalMethods: ["eth_sendTransaction", "eth_accounts", "personal_sign"],
      });

      await provider.connect();

      const accounts = await provider.request({ method: "eth_accounts" });
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts returned from WalletConnect.");
      }
      
      const address = accounts[0];
      const chainIdHex = await provider.request({ method: "eth_chainId" });
      const currentChainId = typeof chainIdHex === "string" ? parseInt(chainIdHex, 16) : chainIdHex;

      // Handle events
      provider.on("accountsChanged", (newAccounts: string[]) => {
        if (newAccounts.length === 0) {
          disconnectWallet();
        } else {
          setWalletAddress(newAccounts[0]);
        }
      });

      provider.on("chainChanged", (newChainIdHex: string) => {
        const id = typeof newChainIdHex === "string" ? parseInt(newChainIdHex, 16) : newChainIdHex;
        setChainId(id);
      });

      setWalletAddress(address);
      setChainId(currentChainId);
      setConnected(true);
      setActiveProvider(provider);
      setPortfolioModeState("LIVE_WALLET");
    } catch (err: any) {
      const msg = err.message || "Failed to connect via WalletConnect";
      setError(msg);
      throw err;
    }
  }, [disconnectWallet]);

  const runSimulation = useCallback(async (mode: "DEMO_SIMULATION" | "LIVE_SIMULATION") => {
    setExecutionState("SIMULATING");
    
    const newTimestamp = Date.now();
    setQuoteTimestamp(newTimestamp);
    
    const activePlan = rescueResult.plans.find((p) => p.id === selectedPlan);
    const activeMode = portfolioMode === "DEMO_PORTFOLIO" ? "DEMO_SIMULATION" : mode;

    if (!activePlan) {
      setExecutionState("SIMULATION_FAILED");
      setSimulationResult({
        success: false,
        reason: "PLAN_INFEASIBLE",
        description: "Selected rescue plan is not available.",
        requiredApprovals: [],
        preparedTransactions: [],
        gasReserveNative: 0,
        remainingNativeOKB: 0,
        provenance: activeMode === "LIVE_SIMULATION" ? "LIVE" : "DEMO",
      });
      return;
    }

    const simRes = simulatePlan(
      parsedIntent,
      activePlan,
      portfolio,
      walletAddress,
      chainId,
      newTimestamp,
      activeMode
    );

    // Simulate progress delay for smooth visual demonstration
    await new Promise((resolve) => setTimeout(resolve, 1200));

    if (simRes.success) {
      setExecutionState("SIMULATION_READY");
    } else {
      setExecutionState("SIMULATION_FAILED");
    }
    setSimulationResult(simRes);
  }, [rescueResult, selectedPlan, parsedIntent, portfolio, walletAddress, chainId, portfolioMode]);

  const resetSimulation = useCallback(() => {
    setExecutionState("IDLE");
    setSimulationResult(null);
  }, []);

  // Rescue planning is simulation-only on X Layer Testnet because the OKX DEX
  // adapter supports X Layer Mainnet (chain index 196), not testnet 1952.
  const startExecution = useCallback(async () => {
    const activePlan = rescueResult.plans.find((p) => p.id === selectedPlan);
    if (!activePlan) return;

    const steps: ExecutionStep[] = [];
    for (const act of activePlan.actions) {
      if (act.symbol !== "OKB") {
        steps.push({
          type: "approval",
          symbol: act.symbol,
          amount: act.sellAmount,
          status: "idle",
        });
      }
      steps.push({
        type: "swap",
        symbol: act.symbol,
        amount: act.sellAmount,
        status: "idle",
      });
    }

    setExecutionSession({
      mode: "DEMO_SIMULATION",
      state: "COMPLETE",
      steps,
      currentStepIndex: Math.max(0, steps.length - 1),
      targetAmount: parsedIntent.targetAmount || 700,
      securedAmount: activePlan.securedAmount,
      confirmedTransactions: [],
    });
  }, [rescueResult, selectedPlan, parsedIntent]);

  const pollWalletVerificationReceipt = useCallback(async (txHash: string) => {
    setWalletVerification((previous) => ({ ...previous, state: "PENDING_CONFIRMATION", activeTxHash: txHash, error: undefined }));
    try {
      const startTime = Date.now();
      const timeoutMs = 90 * 1000;
      let receipt: any = null;

      while (Date.now() - startTime < timeoutMs) {
        try {
          receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
          if (receipt) break;
        } catch (pollErr: any) {
          console.warn("RECEIPT_RPC_ERROR", pollErr.message || pollErr);
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      if (!receipt) {
        setWalletVerification({ state: "CONFIRMATION_TIMEOUT", activeTxHash: txHash, error: "Confirmation is taking longer than expected." });
        return;
      }

      const isSuccess = receipt.status === "success" || receipt.status === "0x1" || receipt.status === 1 || receipt.status === true;
      if (!isSuccess) {
        setWalletVerification({ state: "FAILED_SAFE", activeTxHash: txHash, error: "Verification transaction reverted on-chain" });
        return;
      }

      setWalletVerification(confirmWalletVerification(
        txHash,
        Number(receipt.blockNumber) || 0,
        receipt.gasUsed.toString() || "0",
      ));
    } catch (err: any) {
      setWalletVerification({ state: "FAILED_SAFE", activeTxHash: txHash, error: err.message || "Failed to retrieve verification receipt." });
    }
  }, []);

  const verifyWalletOnXLayer = useCallback(async () => {
      const action = getWalletVerificationAction(walletVerification);
      if (action === "BLOCK" || action === "RESET_REQUIRED") return;
      if (action === "POLL_EXISTING" && walletVerification.activeTxHash) {
        await pollWalletVerificationReceipt(walletVerification.activeTxHash);
        return;
      }
      if (!walletAddress) {
        setWalletVerification({ state: "FAILED_SAFE", error: "Wallet disconnected" });
        return;
      }

      const verificationTx = buildXLayerWalletVerificationTransaction(walletAddress);
      const hasGasReserve = walletVerificationBalanceStatus === "SUFFICIENT";

      const precheck = validateWalletVerificationPreconditions(
        verificationTx,
        walletAddress,
        chainId,
        hasGasReserve,
      );

      if (!precheck.valid) {
        setWalletVerification({ state: "FAILED_SAFE", error: precheck.reason });
        return;
      }

      if (typeof window === "undefined" || (!activeProvider && !(window as any).ethereum)) {
        setWalletVerification({ state: "FAILED_SAFE", error: "EVM wallet not detected" });
        return;
      }

      const provider = activeProvider || (window as any).ethereum;
      setWalletVerification({ state: "AWAITING_WALLET_SIGNATURE" });
      const res = await requestWalletSignatureAndBroadcast(verificationTx, provider);

        if ("error" in res) {
          setWalletVerification({
            state: res.error === "USER_REJECTED" ? "USER_REJECTED" : "FAILED_SAFE",
            error: res.details,
          });
          return;
        }

      const txHash = res.txHash;

      // Gate: Must be a valid 32-byte hex hash
      const isValidHash = typeof txHash === "string" && /^0x[a-fA-F0-9]{64}$/.test(txHash);
      if (!isValidHash) {
        setWalletVerification({ state: "FAILED_SAFE", error: "Invalid transaction hash format received" });
        return;
      }

      setWalletVerification({ state: "PENDING_CONFIRMATION", activeTxHash: txHash });
      await pollWalletVerificationReceipt(txHash);
  }, [walletVerification, walletAddress, chainId, activeProvider, walletVerificationBalanceStatus, pollWalletVerificationReceipt]);

  const resetWalletVerification = useCallback(() => {
    setWalletVerification({ state: "NOT_PERFORMED" });
  }, []);

  const value = useMemo(
    () => ({
      panic,
      setPanic,
      connected,
      setConnected,
      intent,
      setIntent,
      parsedIntent,
      rescueResult,
      marketDataStatus,
      selectedPlan,
      setSelectedPlan,
      walletAddress,
      scannedAddress,
      scanWatchOnlyAddress,
      chainId,
      walletDetected,
      connectWallet,
      disconnectWallet,
      error,
      setError,
      portfolio,
      rpcStatus,
      totalPortfolioValue,
      isScanning,
      scanWalletPortfolio,
      portfolioMode,
      setPortfolioMode,
      
      // Step 7 States
      executionState,
      setExecutionState,
      simulationResult,
      quoteTimestamp,
      setQuoteTimestamp,
      runSimulation,
      resetSimulation,

      // Step 8 States
      executionSession,
      setExecutionSession,
      startExecution,
      walletVerification,
      verifyWalletOnXLayer,
      resetWalletVerification,
      walletVerificationBalanceStatus,

      // Wallet Connectivity Additions
      detectedWallets,
      isOkxWalletInstalled,
      connectWalletConnect,
    }),
    [
      panic,
      setPanic,
      connected,
      setConnected,
      intent,
      setIntent,
      parsedIntent,
      rescueResult,
      marketDataStatus,
      selectedPlan,
      setSelectedPlan,
      walletAddress,
      scannedAddress,
      scanWatchOnlyAddress,
      chainId,
      walletDetected,
      connectWallet,
      disconnectWallet,
      error,
      portfolio,
      rpcStatus,
      totalPortfolioValue,
      isScanning,
      scanWalletPortfolio,
      portfolioMode,
      setPortfolioMode,
      
      // Step 7 States
      executionState,
      simulationResult,
      quoteTimestamp,
      runSimulation,
      resetSimulation,

      // Step 8 States
      executionSession,
      startExecution,
      walletVerification,
      verifyWalletOnXLayer,
      resetWalletVerification,
      walletVerificationBalanceStatus,

      // Wallet Connectivity Additions
      detectedWallets,
      isOkxWalletInstalled,
      connectWalletConnect,
    ],
  );

  return <SaveContext.Provider value={value}>{children}</SaveContext.Provider>;
}

export function useSave() {
  const ctx = useContext(SaveContext);
  if (!ctx) throw new Error("useSave must be used inside SaveProvider");
  return ctx;
}
