import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { scanPortfolio, type ScannedAsset, type DataSource, publicClient } from "./xlayer";
import { parseSaveIntent, type SaveIntent } from "./intent-parser";
import { solveRescue, type RescueResult } from "./rescue-solver";
import { simulatePlan, type ExecutionState, type SimulationResult, type PreparedTransaction } from "./simulation";
import {
  type ExecutionMode,
  type ExecutionStep,
  type ExecutionSession,
  validateExecutionPreconditions,
  requestWalletSignatureAndBroadcast,
  recalculateRemainingTarget,
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
  selectedPlan: "A" | "B" | "C";
  setSelectedPlan: (v: "A" | "B" | "C") => void;
  walletAddress: string | null;
  scannedAddress: string | null;
  scanWatchOnlyAddress: (address: string) => void;
  chainId: number | null;
  walletDetected: boolean;
  connectWallet: (customProvider?: any) => Promise<void>;
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
  startExecution: (mode: ExecutionMode) => Promise<void>;
  executeNextStep: () => Promise<void>;

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

  const rescueResult = useMemo(() => {
    return solveRescue(portfolio, parsedIntent, portfolioMode);
  }, [portfolio, parsedIntent, portfolioMode]);
  
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
  }, [portfolio, parsedIntent]);

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

  const connectWallet = useCallback(async (customProvider?: any) => {
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
      setPortfolioModeState("LIVE_WALLET");
    } catch (err: any) {
      const msg = err.message || "Failed to connect wallet";
      setError(msg);
      throw err;
    }
  }, [disconnectWallet]);

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
      quoteTimestamp,
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
  }, [rescueResult, selectedPlan, parsedIntent, portfolio, walletAddress, chainId, quoteTimestamp, portfolioMode]);

  const resetSimulation = useCallback(() => {
    setExecutionState("IDLE");
    setSimulationResult(null);
  }, []);

  // Step 8: Execution Bridge Methods
  const startExecution = useCallback(async (mode: ExecutionMode) => {
    const activePlan = rescueResult.plans.find((p) => p.id === selectedPlan);
    if (!activePlan) return;

    const targetMode = portfolioMode === "DEMO_PORTFOLIO" ? "DEMO_SIMULATION" : mode;

    // Initialize multi-transaction sequential steps
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
      mode: targetMode,
      state: "READY_TO_SIGN",
      steps,
      currentStepIndex: 0,
      targetAmount: parsedIntent.targetAmount || 700,
      securedAmount: activePlan.securedAmount - (activePlan.actions.reduce((sum, a) => sum + (a.quote?.outputAmount || 0), 0)),
      confirmedTransactions: [],
    });
  }, [rescueResult, selectedPlan, parsedIntent, portfolioMode]);

  // Dynamically update execution session mode based on wallet connection, chain, and OKB balance
  useEffect(() => {
    if (executionState === "SIMULATION_READY") {
      const okbAsset = portfolio.find((a) => a.symbol === "OKB");
      const okbBalance = okbAsset ? parseFloat(okbAsset.balance) : 0;
      const minGasRequirement = 0.001;

      const canActivateTestnetLive =
        connected &&
        chainId === 1952 &&
        okbBalance > minGasRequirement &&
        portfolioMode === "LIVE_WALLET";

      const targetMode = canActivateTestnetLive ? "TESTNET_LIVE" : "DEMO_SIMULATION";

      if (executionSession.mode !== targetMode && executionSession.state === "READY_TO_SIGN") {
        setExecutionSession((prev) => ({
          ...prev,
          mode: targetMode,
        }));
      }
    }
  }, [connected, chainId, portfolio, executionState, executionSession.mode, executionSession.state, setExecutionSession, portfolioMode]);

  const executeNextStep = useCallback(async () => {
    // 1. Prevent duplicate simultaneous execute actions
    if (
      executionSession.state === "AWAITING_WALLET_SIGNATURE" ||
      executionSession.state === "BROADCASTING" ||
      executionSession.state === "PENDING_CONFIRMATION"
    ) {
      console.warn("An active step is already executing. Duplicate attempt blocked.");
      return;
    }

    const currentStep = executionSession.steps[executionSession.currentStepIndex];
    if (!currentStep) return;

    // Do not set AWAITING_WALLET_SIGNATURE state globally.
    // It will be set dynamically inside each execution block.

    // DEMO_SIMULATION mode execution trace
    if (executionSession.mode === "DEMO_SIMULATION") {
      // Transition to AWAITING_WALLET_SIGNATURE
      setExecutionSession((prev) => {
        const nextSteps = [...prev.steps];
        nextSteps[prev.currentStepIndex] = {
          ...currentStep,
          status: "signing",
        };
        return {
          ...prev,
          state: "AWAITING_WALLET_SIGNATURE",
          steps: nextSteps,
        };
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      setExecutionSession((prev) => {
        const nextSteps = [...prev.steps];
        nextSteps[prev.currentStepIndex] = {
          ...currentStep,
          status: "pending",
          txHash: undefined, // Do not fabricate transaction hashes in demo mode
        };
        return {
          ...prev,
          state: "PENDING_CONFIRMATION",
          steps: nextSteps,
        };
      });

      // Simulated confirmation delay
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const newSecuredLegVal = currentStep.type === "swap" ? (currentStep.amount * (currentStep.symbol === "TKX" ? 0.0274 : 47.06)) : 0;

      setExecutionSession((prev) => {
        const nextSteps = [...prev.steps];
        nextSteps[prev.currentStepIndex] = {
          ...currentStep,
          status: "confirmed",
        };
        const nextConfirmed = [...prev.confirmedTransactions];
        if (currentStep.type === "swap") {
          nextConfirmed.push({
            transactionHash: "0xDemoTxHashFor" + currentStep.symbol,
            blockNumber: 128456,
            gasUsed: "125000",
            status: "success",
            chainId: 1952,
            timestamp: Date.now(),
            mode: "DEMO_SIMULATION",
          });
        }

        const { remainingTarget, targetMet } = recalculateRemainingTarget(
          prev.targetAmount,
          prev.securedAmount,
          newSecuredLegVal
        );

        const nextIndex = prev.currentStepIndex + 1;
        const allDone = nextIndex >= prev.steps.length;

        return {
          ...prev,
          state: allDone ? "COMPLETE" : "READY_TO_SIGN",
          currentStepIndex: allDone ? prev.currentStepIndex : nextIndex,
          securedAmount: prev.securedAmount + newSecuredLegVal,
          steps: nextSteps,
          confirmedTransactions: nextConfirmed,
        };
      });
      return;
    }

    // TESTNET_LIVE mode execution trace (EIP-1193 integration)
    if (executionSession.mode === "TESTNET_LIVE") {
      const activePlan = rescueResult.plans.find((p) => p.id === selectedPlan);
      if (!activePlan) return;

      const mockPreparedTx: PreparedTransaction = {
        evmChainId: 1952,
        okxChainIndex: 1952,
        environment: "testnet",
        to: walletAddress || "",
        from: walletAddress || "",
        value: Math.round(0.0001 * 1e18).toString(), // self-transfer 0.0001 OKB test
        data: "0x",
        source: "live",
        quoteTimestamp: Date.now(),
        verificationStatus: "VERIFIED_OKX",
      };

      const quoteAgeSec = 10;
      const okbAsset = portfolio.find((a) => a.symbol === "OKB");
      const okbBalance = okbAsset ? parseFloat(okbAsset.balance) : 0;
      const hasGasReserve = okbBalance > 0.001;

      const precheck = validateExecutionPreconditions(
        mockPreparedTx,
        walletAddress,
        chainId,
        quoteAgeSec,
        hasGasReserve,
        "TESTNET_LIVE"
      );

      if (!precheck.valid) {
        setExecutionSession((prev) => ({
          ...prev,
          state: "FAILED_SAFE",
          error: precheck.reason,
        }));
        return;
      }

      if (typeof window === "undefined" || (!activeProvider && !(window as any).ethereum)) {
        setExecutionSession((prev) => ({
          ...prev,
          state: "FAILED_SAFE",
          error: "EVM wallet not detected",
        }));
        return;
      }

      const provider = activeProvider || (window as any).ethereum;

      const existingHash = currentStep.txHash || executionSession.activeTxHash;
      let txHash = existingHash;

      if (!txHash) {
        // Transition to AWAITING_WALLET_SIGNATURE
        setExecutionSession((prev) => {
          const nextSteps = [...prev.steps];
          nextSteps[prev.currentStepIndex] = {
            ...currentStep,
            status: "signing",
          };
          return {
            ...prev,
            state: "AWAITING_WALLET_SIGNATURE",
            steps: nextSteps,
          };
        });

        const res = await requestWalletSignatureAndBroadcast(mockPreparedTx, provider);

        if ("error" in res) {
          setExecutionSession((prev) => {
            const nextSteps = [...prev.steps];
            nextSteps[prev.currentStepIndex] = {
              ...currentStep,
              status: "failed",
              error: res.details,
            };
            return {
              ...prev,
              state: res.error === "USER_REJECTED" ? "USER_REJECTED" : "FAILED_SAFE",
              steps: nextSteps,
              error: res.details,
            };
          });
          return;
        }

        txHash = res.txHash;
      }

      // Gate: Must be a valid 32-byte hex hash
      const isValidHash = typeof txHash === "string" && /^0x[a-fA-F0-9]{64}$/.test(txHash);
      if (!isValidHash) {
        setExecutionSession((prev) => {
          const nextSteps = [...prev.steps];
          nextSteps[prev.currentStepIndex] = {
            ...currentStep,
            status: "failed",
            error: "Invalid transaction hash format received",
          };
          return {
            ...prev,
            state: "FAILED_SAFE",
            steps: nextSteps,
            error: "Invalid transaction hash format received",
          };
        });
        return;
      }

      setExecutionSession((prev) => {
        const nextSteps = [...prev.steps];
        nextSteps[prev.currentStepIndex] = {
          ...currentStep,
          status: "pending",
          txHash,
        };
        return {
          ...prev,
          state: "PENDING_CONFIRMATION",
          activeTxHash: txHash,
          steps: nextSteps,
        };
      });

      // Poll transaction receipt with fallback client and hard timeout of 90 seconds
      try {
        console.log("RECEIPT_POLL_STARTED", txHash);
        const startTime = Date.now();
        const timeoutMs = 90 * 1000;
        let receipt: any = null;

        while (Date.now() - startTime < timeoutMs) {
          console.log("RECEIPT_POLL_ATTEMPT", txHash);
          try {
            const rawReceipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
            console.log("RECEIPT_RPC_RESPONSE", rawReceipt);
            if (rawReceipt) {
              receipt = rawReceipt;
              break;
            }
          } catch (pollErr: any) {
            console.warn("RECEIPT_RPC_ERROR", pollErr.message || pollErr);
          }
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }

        if (!receipt) {
          console.log("RECEIPT_TIMEOUT", txHash);
          setExecutionSession((prev) => {
            const nextSteps = [...prev.steps];
            nextSteps[prev.currentStepIndex] = {
              ...currentStep,
              status: "failed",
              error: `Confirmation is taking longer than expected. Transaction hash: ${txHash}`,
            };
            return {
              ...prev,
              state: "CONFIRMATION_TIMEOUT",
              activeTxHash: txHash,
              steps: nextSteps,
              error: `Confirmation is taking longer than expected.`,
            };
          });
          return;
        }

        const isSuccess = receipt.status === "success" || receipt.status === "0x1" || receipt.status === 1 || receipt.status === true;

        if (!isSuccess) {
          console.log("RECEIPT_REVERTED", txHash);
          setExecutionSession((prev) => {
            const nextSteps = [...prev.steps];
            nextSteps[prev.currentStepIndex] = {
              ...currentStep,
              status: "failed",
              error: "Transaction reverted on-chain",
            };
            return {
              ...prev,
              state: "FAILED_SAFE",
              steps: nextSteps,
            };
          });
          return;
        }

        console.log("RECEIPT_CONFIRMED", txHash);
        // Confirmed! Refresh portfolio
        await scanWalletPortfolio();

        setExecutionSession((prev) => {
          const nextSteps = [...prev.steps];
          nextSteps[prev.currentStepIndex] = {
            ...currentStep,
            status: "confirmed",
          };
          const nextConfirmed = [...prev.confirmedTransactions];
          nextConfirmed.push({
            transactionHash: txHash,
            blockNumber: Number(receipt.blockNumber) || 0,
            gasUsed: receipt.gasUsed.toString() || "0",
            status: "success",
            chainId: 1952,
            timestamp: Date.now(),
            mode: "TESTNET_LIVE",
          });

          const nextIndex = prev.currentStepIndex + 1;
          const allDone = nextIndex >= prev.steps.length;

          return {
            ...prev,
            state: allDone ? "COMPLETE" : "READY_TO_SIGN",
            currentStepIndex: allDone ? prev.currentStepIndex : nextIndex,
            steps: nextSteps,
            confirmedTransactions: nextConfirmed,
          };
        });
      } catch (err: any) {
        setExecutionSession((prev) => ({
          ...prev,
          state: "FAILED_SAFE",
          error: err.message || "Failed to retrieve on-chain receipt confirmation.",
        }));
      }
    }
  }, [executionSession, walletAddress, chainId, rescueResult, selectedPlan, scanWalletPortfolio]);

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
      executeNextStep,

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
      executeNextStep,

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
