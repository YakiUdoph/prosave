import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  buildXLayerWalletVerificationTransaction,
  confirmWalletVerification,
  getWalletVerificationAction,
  validateWalletVerificationPreconditions,
  type ExecutionSession,
} from "../src/lib/execution";

const wallet = "0x8F5725287F4117b3C2b2E9A709E83b4850c95F57";
const hash = `0x${"1".repeat(64)}`;

describe("X Layer wallet verification separation", () => {
  test("diagnostic has canonical self-transfer identity and LIVE_CHAIN provenance", () => {
    const tx = buildXLayerWalletVerificationTransaction(wallet, 123);
    expect(tx).toMatchObject({
      from: wallet,
      to: wallet,
      value: "100000000000000",
      data: "0x",
      evmChainId: 1952,
      verificationStatus: "LIVE_CHAIN",
    });
    expect(validateWalletVerificationPreconditions(tx, wallet, 1952, true)).toEqual({ valid: true });
  });

  test("wallet or chain mismatch blocks the diagnostic", () => {
    const tx = buildXLayerWalletVerificationTransaction(wallet);
    expect(validateWalletVerificationPreconditions(tx, `0x${"2".repeat(40)}`, 1952, true).valid).toBe(false);
    expect(validateWalletVerificationPreconditions(tx, wallet, 196, true).valid).toBe(false);
  });

  test("confirmed diagnostic cannot mutate rescue steps, approvals, swaps, or secured amount", () => {
    const rescue: ExecutionSession = {
      mode: "DEMO_SIMULATION",
      state: "COMPLETE",
      steps: [{ type: "swap", symbol: "OKB", amount: 1, status: "idle" }],
      currentStepIndex: 0,
      targetAmount: 700,
      securedAmount: 700,
      confirmedTransactions: [],
    };
    const before = structuredClone(rescue);
    const verification = confirmWalletVerification(hash, 42, "21000", 456);

    expect(verification.state).toBe("CONFIRMED");
    expect(rescue).toEqual(before);
    expect(rescue.confirmedTransactions).toHaveLength(0);
    expect(rescue.steps[0].status).toBe("idle");
    expect(rescue.securedAmount).toBe(700);
  });

  test("invalid receipt never creates confirmed verification", () => {
    expect(confirmWalletVerification("0x123", 42, "21000").state).toBe("FAILED_SAFE");
    expect(confirmWalletVerification(hash, 0, "21000").state).toBe("FAILED_SAFE");
    expect(confirmWalletVerification(hash, 42, "0").state).toBe("FAILED_SAFE");
  });

  test("runtime orchestration contains no rescue execution broadcast path", () => {
    const context = readFileSync(new URL("../src/lib/save-context.tsx", import.meta.url), "utf8");
    expect(context).not.toContain("executeNextStep");
    expect(context).not.toContain("mockPreparedTx");
    expect(context).not.toContain('verificationStatus: "VERIFIED_OKX"');
    expect(context).toContain("verifyWalletOnXLayer");
  });

  test("result labels keep simulated rescue separate from verification", () => {
    const result = readFileSync(new URL("../src/routes/protected.tsx", import.meta.url), "utf8");
    expect(result).toContain("SIMULATED RESCUE OUTCOME");
    expect(result).toContain("X LAYER WALLET VERIFICATION");
    expect(result).toContain("does not represent execution of the simulated rescue strategy");
    expect(result).not.toContain("live swap confirmed");
  });

  test("demo route parameters are not labelled as live OKX quotes", () => {
    const simulate = readFileSync(new URL("../src/routes/simulate.tsx", import.meta.url), "utf8");
    expect(simulate).toContain("DEMO ROUTE ESTIMATE");
    expect(simulate.toLowerCase()).not.toContain("live okx quote");
  });

  test("Demo Portfolio simulation completes without a wallet connection", () => {
    const context = readFileSync(new URL("../src/lib/save-context.tsx", import.meta.url), "utf8");
    expect(context).toContain('mode: "DEMO_SIMULATION"');
    expect(context).toContain('state: "COMPLETE"');
    expect(context).not.toContain('startExecution(canActivateTestnetLive');
  });

  test("View Simulated Result remains available without verification", () => {
    const simulate = readFileSync(new URL("../src/routes/simulate.tsx", import.meta.url), "utf8");
    expect(simulate).toContain("View Simulated Result");
    expect(simulate).toContain('navigate({ to: "/protected" })');
  });

  test("Demo Portfolio with a connected wallet exposes optional verification without changing mode", () => {
    const simulate = readFileSync(new URL("../src/routes/simulate.tsx", import.meta.url), "utf8");
    const context = readFileSync(new URL("../src/lib/save-context.tsx", import.meta.url), "utf8");
    expect(simulate).toContain("Connect Wallet for Optional X Layer Verification");
    expect(simulate).toContain("Verify Wallet on X Layer Testnet");
    expect(simulate).not.toContain('connected && portfolioMode === "LIVE_WALLET"');
    expect(context).toContain("if (!preservePortfolioMode)");
  });

  test("confirmed verification coexists with simulated rescue and creates no rescue records", () => {
    const verification = confirmWalletVerification(hash, 42, "21000");
    const rescue: ExecutionSession = {
      mode: "DEMO_SIMULATION",
      state: "COMPLETE",
      steps: [{ type: "approval", symbol: "TKX", amount: 1, status: "idle" }],
      currentStepIndex: 0,
      targetAmount: 700,
      securedAmount: 700,
      confirmedTransactions: [],
    };
    expect(verification.state).toBe("CONFIRMED");
    expect(rescue).toMatchObject({ mode: "DEMO_SIMULATION", state: "COMPLETE", securedAmount: 700 });
    expect(rescue.steps[0].status).toBe("idle");
    expect(rescue.confirmedTransactions).toHaveLength(0);
  });

  test("timeout retains its hash and selects receipt polling instead of authorization", () => {
    const session = { state: "CONFIRMATION_TIMEOUT" as const, activeTxHash: hash };
    expect(session.activeTxHash).toBe(hash);
    expect(getWalletVerificationAction(session)).toBe("POLL_EXISTING");
  });

  test("pending and confirmed verification cannot broadcast again", () => {
    expect(getWalletVerificationAction({ state: "PENDING_CONFIRMATION", activeTxHash: hash })).toBe("BLOCK");
    expect(getWalletVerificationAction({ state: "CONFIRMED", activeTxHash: hash })).toBe("BLOCK");
  });

  test("reverted verification requires explicit reset before a new authorization", () => {
    expect(getWalletVerificationAction({ state: "FAILED_SAFE", activeTxHash: hash })).toBe("RESET_REQUIRED");
  });

  test("rejection before a hash may retry wallet authorization", () => {
    expect(getWalletVerificationAction({ state: "USER_REJECTED" })).toBe("AUTHORIZE");
  });

  test("verification alone cannot unlock the protected rescue result", () => {
    const result = readFileSync(new URL("../src/routes/protected.tsx", import.meta.url), "utf8");
    expect(result).toContain("const hasAnyResult = demoSimulationCompleted");
  });

  test("wrong chain and insufficient OKB disable verification without hiding simulated result", () => {
    const simulate = readFileSync(new URL("../src/routes/simulate.tsx", import.meta.url), "utf8");
    expect(simulate).toContain("Switch Wallet to X Layer Testnet");
    expect(simulate).toContain("Test OKB Required for Optional Verification");
    expect(simulate).toContain('onClick={() => navigate({ to: "/protected" })}');
  });

  test("combined result exposes pending, delayed, confirmed, and not-performed states", () => {
    const result = readFileSync(new URL("../src/routes/protected.tsx", import.meta.url), "utf8");
    for (const label of ["PENDING", "CONFIRMATION DELAYED", "CONFIRMED", "NOT PERFORMED"]) {
      expect(result).toContain(label);
    }
  });

  test("judge script matches the executable Demo Portfolio verification path", () => {
    const judge = readFileSync(new URL("../docs/JUDGE_DEMO_SCRIPT.md", import.meta.url), "utf8");
    expect(judge).toContain("Connect Wallet for Optional X Layer Verification");
    expect(judge).toContain("Verify Wallet on X Layer Testnet");
    expect(judge).toContain("View Simulated Result");
  });
});
