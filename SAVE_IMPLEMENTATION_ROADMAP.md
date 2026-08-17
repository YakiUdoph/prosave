# SAVE: Implementation Roadmap

This document outlines the engineering priorities, task definitions, and acceptance criteria for completing the SAVE hackathon MVP.

---

## 🎯 The Golden Path Acceptance Test
This is the core end-to-end user journey that must work perfectly for the final submission:
1. **Wallet Connection**: User opens SAVE and clicks "Connect Wallet".
2. **Network Detect**: App automatically detects the wallet's network and switches it to **X Layer Testnet** (Chain ID 1952).
3. **Portfolio Scan**: The Scan page opens and performs on-chain queries to retrieve native `OKB` and metadata for `WETH` / `USDC` / `TKX`.
4. **Intent Submission**: User types: `"Get me $700 USDC. Don't sell my ETH unless necessary."`
5. **Intent Parsing**: The parsing engine extracts target ($700 USDC) and protection constraints (Protect ETH).
6. **Rescue Calculations**: The Rescue Solver evaluates strategies (Plan A, B, C), scoring each against damage metrics.
7. **Route Validation**: Integrates with OKX OnchainOS to check routes, filtering out high-slippage/ unsafe configurations.
8. **Recommendation**: Recommends the optimal plan (Plan B, keeping ETH untouched, liquidating TKX and partial OKB).
9. **Simulation**: Shows expected USDC output, transaction fees (gas), slippage, price impact, and the visual swap route steps.
10. **Authorization**: User holds the confirmation trigger, prompting a wallet signature request.
11. **On-Chain Execution**: Swaps are executed on-chain (using live OKB swaps where technically supported, fallback to simulated tx receipts if contracts are unverified, clearly flagged in logs).
12. **Refresh & Confirm**: Portfolio refreshes showing the secured USDC and updated on-chain balances.

---

## 🚦 Task Breakdown by Priority

### 🟥 P0 — Submission Critical (Must Work)

#### 1. Secure Step 3 Dynamic Portfolio Scan
- **Description**: Finish connecting the portfolio dashboard to client-safe public RPCs.
- **Acceptance Criteria**: Dynamic scans query native OKB from the connected wallet. WETH and USDC are flagged as `unverified` and fallback to demo/unverified values. No process environment keys are exposed to the client.

#### 2. Natural Language Intent Parser
- **Description**: Implement the deterministic parser in `src/lib/intent-parser.ts`.
- **Acceptance Criteria**: Extracts parameters (`targetAmount`, `targetSymbol`, `protectedAssets`) from common intent statements.

#### 3. Rescue Solver Engine
- **Description**: Implement solver algorithm in `src/lib/rescue-solver.ts`.
- **Acceptance Criteria**: Correctly computes liquidation weights for Plan A, Plan B (preservation focus), and Plan C.

#### 4. Route Evaluation & OKX Quote Integration
- **Description**: Setup TanStack Start Server Function to retrieve live quotes from the OKX DEX router using HMAC signatures.
- **Acceptance Criteria**: Retrieves pricing and routes. Automatically rejects paths with price impact $> 5\%$ or slippage $> 3\%$.

#### 5. User-Authorized Execution Bridge
- **Description**: Implement transaction broadcasting through the connected browser wallet.
- **Acceptance Criteria**: Prompts user's MetaMask/OKX Wallet to sign the required swaps. Never executes programmatic signatures using server keys.

#### 6. Refresh and Confirmation States
- **Description**: Connect the `/protected` screen to the broadcast receipt, updating the active portfolio balances.
- **Acceptance Criteria**: Shows correct output values and transaction hash references upon completion.

---

### 🟨 P1 — High Impact Judging Enhancements

#### 1. Route Rejection Visualization
- **Description**: Animate the route evaluation pipeline on the simulation screen, visually demonstrating the rejection of unsafe or high-slippage routes.
- **Acceptance Criteria**: Shows red badges labeled "REJECTED: Price Impact > 5%" or "REJECTED: Protected Asset Constraint".

#### 2. Protection Score Motion
- **Description**: Add smooth circular dial progressions and bar animations to the dashboard telemetry metrics.
- **Acceptance Criteria**: Dial counts up to the calculated score (e.g. from 0 to 82) on page load.

#### 3. Explicit Demo Mode Instrumentation
- **Description**: Setup clear visual indicators (badges and banners) explaining whether the current session is executing live on-chain or running offline in fallback demo mode.
- **Acceptance Criteria**: Banners read "RUNNING IN DEMO MODE (RPC OFFLINE)" when the local network experiences connection issues.

---

### 🟦 P2 — Post-Core Polish & Aesthetics

#### 1. Subtle Translucent Logo Brandmark
- **Description**: Add a soft, low-opacity ambient logo behind command center sections.
- **Acceptance Criteria**: Retains absolute readability of monospaced figures; no watermark slap effect.

#### 2. Advanced Interactive Transitions
- **Description**: Micro-animations on card hover and tactile clicks.
- **Acceptance Criteria**: Smooth hover transitions matching the visual design system specifications.
