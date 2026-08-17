import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { scanPortfolio, type ScannedAsset, type DataSource } from "./xlayer";
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
  chainId: number | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  error: string | null;
  setError: (err: string | null) => void;
  portfolio: ScannedAsset[];
  rpcStatus: "online" | "offline";
  totalPortfolioValue: number;
  isScanning: boolean;
  scanWalletPortfolio: () => Promise<void>;
  
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
};

const SaveContext = createContext<SaveState | null>(null);

export function SaveProvider({ children }: { children: ReactNode }) {
  const [panic, setPanicState] = useState(false);
  const [connected, setConnected] = useState(false);
  const [intent, setIntentState] = useState("Get me $700 USDC. Don't sell my ETH unless necessary.");
  const [parsedIntent, setParsedIntent] = useState<SaveIntent>(() =>
    parseSaveIntent("Get me $700 USDC. Don't sell my ETH unless necessary.")
  );
  const [selectedPlan, setSelectedPlan] = useState<"A" | "B" | "C">("B");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Portfolio states
  const [portfolio, setPortfolio] = useState<ScannedAsset[]>([]);
  const [rpcStatus, setRpcStatus] = useState<"online" | "offline">("offline");

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
    return solveRescue(portfolio, parsedIntent);
  }, [portfolio, parsedIntent]);
  
  const [totalPortfolioValue, setTotalPortfolioValue] = useState<number>(4832); // approved UI baseline default
  const [isScanning, setIsScanning] = useState(false);

  const setPanic = useCallback((v: boolean) => setPanicState(v), []);

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
    setChainId(null);
    setConnected(false);
    setExecutionState("IDLE");
    setSimulationResult(null);
  }, []);

  const scanWalletPortfolio = useCallback(async () => {
    setIsScanning(true);
    try {
      const result = await scanPortfolio(walletAddress);
      setPortfolio(result.assets);
      setRpcStatus(result.rpcStatus);
      setTotalPortfolioValue(result.totalValue);
    } catch (err: any) {
      console.error("X Layer portfolio scan failed:", err);
    } finally {
      setIsScanning(false);
    }
  }, [walletAddress]);

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
          } else {
            // Disconnected: load demo baseline portfolio
            const result = await scanPortfolio(null);
            setPortfolio(result.assets);
            setRpcStatus(result.rpcStatus);
            setTotalPortfolioValue(result.totalValue);
          }
        } catch (err) {
          console.error("Auto-connect check failed:", err);
        }
      } else {
        // No wallet: load demo baseline portfolio
        const result = await scanPortfolio(null);
        setPortfolio(result.assets);
        setRpcStatus(result.rpcStatus);
        setTotalPortfolioValue(result.totalValue);
      }
    };
    checkConnection();
  }, []);

  // Automatically scan portfolio when wallet address changes
  useEffect(() => {
    scanWalletPortfolio();
  }, [walletAddress, scanWalletPortfolio]);

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

  const runSimulation = useCallback(async (mode: "DEMO_SIMULATION" | "LIVE_SIMULATION") => {
    setExecutionState("SIMULATING");
    
    const activePlan = rescueResult.plans.find((p) => p.id === selectedPlan);
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
        provenance: mode === "LIVE_SIMULATION" ? "LIVE" : "DEMO",
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
      mode
    );

    // Simulate progress delay for smooth visual demonstration
    await new Promise((resolve) => setTimeout(resolve, 1200));

    if (simRes.success) {
      setExecutionState("SIMULATION_READY");
    } else {
      setExecutionState("SIMULATION_FAILED");
    }
    setSimulationResult(simRes);
  }, [rescueResult, selectedPlan, parsedIntent, portfolio, walletAddress, chainId, quoteTimestamp]);

  const resetSimulation = useCallback(() => {
    setExecutionState("IDLE");
    setSimulationResult(null);
  }, []);

  // Step 8: Execution Bridge Methods
  const startExecution = useCallback(async (mode: ExecutionMode) => {
    const activePlan = rescueResult.plans.find((p) => p.id === selectedPlan);
    if (!activePlan) return;

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
      mode,
      state: "READY_TO_SIGN",
      steps,
      currentStepIndex: 0,
      targetAmount: parsedIntent.targetAmount || 700,
      securedAmount: activePlan.securedAmount - (activePlan.actions.reduce((sum, a) => sum + (a.quote?.outputAmount || 0), 0)),
      confirmedTransactions: [],
    });
  }, [rescueResult, selectedPlan, parsedIntent]);

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

    // DEMO_SIMULATION mode execution trace
    if (executionSession.mode === "DEMO_SIMULATION") {
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
      const hasGasReserve = true;

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

      if (typeof window === "undefined" || !(window as any).ethereum) {
        setExecutionSession((prev) => ({
          ...prev,
          state: "FAILED_SAFE",
          error: "EVM wallet not detected",
        }));
        return;
      }

      const provider = (window as any).ethereum;
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

      const txHash = res.txHash;
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

      // Poll transaction receipt
      try {
        let receipt: any = null;
        for (let attempt = 0; attempt < 30; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          try {
            const rawReceipt = await provider.request({
              method: "eth_getTransactionReceipt",
              params: [txHash],
            });
            if (rawReceipt) {
              receipt = rawReceipt;
              break;
            }
          } catch (pollErr) {
            console.warn("Poll receipt attempt error:", pollErr);
          }
        }

        if (!receipt) {
          throw new Error("Transaction receipt lookup timed out. Check block explorer.");
        }

        const isSuccess = receipt.status === "0x1" || receipt.status === 1 || receipt.status === true;

        if (!isSuccess) {
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
            blockNumber: parseInt(receipt.blockNumber, 16) || 0,
            gasUsed: parseInt(receipt.gasUsed, 16).toString() || "0",
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
      chainId,
      connectWallet,
      disconnectWallet,
      error,
      setError,
      portfolio,
      rpcStatus,
      totalPortfolioValue,
      isScanning,
      scanWalletPortfolio,
      
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
      chainId,
      connectWallet,
      disconnectWallet,
      error,
      portfolio,
      rpcStatus,
      totalPortfolioValue,
      isScanning,
      scanWalletPortfolio,
      
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
    ],
  );

  return <SaveContext.Provider value={value}>{children}</SaveContext.Provider>;
}

export function useSave() {
  const ctx = useContext(SaveContext);
  if (!ctx) throw new Error("useSave must be used inside SaveProvider");
  return ctx;
}
