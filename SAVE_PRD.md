# SAVE: Product Requirements Document (PRD)

## 1. Executive Summary
SAVE is an intent-driven portfolio protection engine built for X Layer with OKX OnchainOS integration infrastructure. In the current hackathon build, deterministic natural-language constraint extraction drives competing, scored rescue plans with simulated execution parameters. Optional X Layer Testnet wallet verification is isolated from rescue execution.

---

## 2. Real User Problem
During market sell-offs, protocol insolvencies, or sudden liquidations, users face intense cognitive overload. To preserve capital or secure a specific dollar value, they must make multiple high-pressure decisions:
- Which assets should they sell first to minimize long-term upside loss?
- Which assets have deep enough liquidity to withstand a swap without heavy slippage?
- What are the gas costs and routing fees across different protocols?
- How do they configure slippage tolerances to avoid front-running or transaction failures?
Doing this manually requires executing multiple consecutive trades across separate dashboards, wasting precious block times and incurring massive transaction friction.

---

## 3. Why Current Tools Fail
- **DEX Aggregators**: Target token-to-token swaps. They require the user to decide the exact inputs, outputs, and paths, failing to understand portfolio-level constraints (e.g., protecting specific holdings).
- **Portfolio Trackers**: Read-only dashboards. They display losses but do not offer active, outcome-oriented liquidation paths.
- **DeFi Guardrails / Bots**: Require complex, pre-programmed trigger logic (e.g., set up limit orders or trailing stop-losses for every single asset), which is slow to configure and cannot adapt to dynamic natural-language requirements in real time.

---

## 4. Target Users
- **Primary**: Active Web3 traders, yield farmers, and retail investors holding diversified portfolios of native and ERC-20 assets on X Layer who need immediate, stress-free liquidity or risk reduction.
- **Secondary (Future)**: Multisig treasuries, automated vault managers, and non-custodial wallet providers seeking plug-and-play risk guardrails.

---

## 5. Product Thesis
Emergency risk mitigation is not a swap problem; it is a **constraint-satisfaction outcome problem**. Web3 users do not want to execute swaps; they want to secure a target amount of capital while minimizing the damage to their overall investment thesis. By combining a natural-language parser, a multi-asset solver, and OKX OnchainOS liquidity routing, SAVE handles the entire optimization loop automatically.

---

## 6. Why SAVE Must Exist: Outcome Execution vs. Token Swapping
Traditional DeFi operates on a transactional level:
$$\text{Input Token} \rightarrow \text{Aggregator} \rightarrow \text{Output Token}$$
If a user needs \$700 USDC and holds ETH, OKB, and Token X, they must manually calculate how much of each to sell, execute three separate swaps, and bear the risk of slippage and gas duplication.

SAVE operates on a **goal-oriented outcome level**:
$$\text{Portfolio State} + \text{Natural Language Intent} \rightarrow \text{SAVE Engine} \rightarrow \text{Optimized Multi-Asset Route} \rightarrow \text{Unified Execution}$$
SAVE computes the global portfolio state, protects high-conviction assets, identifies the lowest-slippage paths using OKX OnchainOS, and completes the entire rescue operation in a single signature transaction.

---

## 7. The Canonical Use Case
- **User Intent**: `"Get me $700 USDC. Don't sell my ETH unless necessary."`
- **Initial Portfolio**:
  - **ETH (WETH)**: $2,418 value (0.842 ETH) — *Marked Protected*
  - **OKB**: $1,486 value (31.5 OKB) — *Unprotected*
  - **Token X (TKX)**: $516 value (18,400 TKX) — *Unprotected (High Volatility)*
- **Outcome**: SAVE calculates the optimal rescue plan:
  1. Liquidate 100% of Token X (high volatility, high risk).
  2. Liquidate a portion of OKB (medium risk) to cover the remainder of the \$700 USDC target.
  3. Keep 100% of ETH untouched (satisfying the constraint).
  4. Present the selected route (Plan B), show the simulation, and request authorization.

---

## 8. Full User Journey
1. **Connect**: User visits the application and connects their wallet (switching to X Layer Testnet).
2. **Scan**: SAVE scans the native OKB and on-chain ERC-20 balances, evaluating risk and liquidity.
3. **Command**: User views their portfolio dashboard, risk levels, and enters their natural-language intent.
4. **Plan**: SAVE parses the intent, extracts constraints, generates 3 candidate rescue strategies (Plan A, B, C), and highlights the optimal recommendation.
5. **Validate**: The selected plan runs through local safety and feasibility checks using simulated route parameters.
6. **Verify (Optional)**: The user may authorize a separate X Layer Testnet wallet/settlement diagnostic.
7. **Result**: SAVE presents the simulated rescue outcome separately from any wallet-verification receipt.

---

## 9. Functional Requirements
- **Wallet Handshake**: Injected EIP-1193 provider connection supporting automatic chain switching to X Layer Testnet (Chain ID 1952).
- **Portfolio Scans**: Live on-chain balance checks for native OKB and unverified/demo contract reads for WETH and USDC.
- **Intent Parsing**: Extraction of numerical target value, output symbol (e.g., USDC), and list of protected symbols (e.g., ETH) from free text.
- **Rescue Solver**: Algorithm evaluating candidate liquidations:
  - **Plan A**: Minimize gas (sell major assets first, potentially breaching protected constraints).
  - **Plan B**: Minimize damage (preserve protected assets, sell high-risk assets first).
  - **Plan C**: Conservative preservation (sell zero protected assets, even if target is not fully met).
- **Route Validation**: Scoring paths using gas, slippage, price impact, and protocol safety scores.
- **Plan Validation**: Local policy, feasibility, estimate-age, gas, and approval-requirement checks; not EVM transaction simulation.
- **Optional Verification Broadcast**: User-authorized 0.0001 OKB self-transfer proving wallet/network/settlement plumbing only.

---

## 10. Non-Functional Requirements
- **Visual Freeze**: The frontend styling, colors, layout, and visual components are locked to the approved Git baseline (`62663f3d...`).
- **Resilience**: RPC fallback config supporting failovers to alternative public nodes without crashing the interface.
- **Security**: Strict client-side isolation of secrets (HMAC signature routines, API keys, and private keys remain server-side).
- **Performance**: Instant UI feedback during transaction hold-to-confirm, scanning, and calculation states.

---

## 11. Core Subsystems Detail

### A. Intent Engine
Converts natural language into structured parameters:
- **Input**: `"Get me 700 USDC. Don't sell my ETH."`
- **Output**:
  ```json
  {
    "targetAmount": 700.0,
    "targetSymbol": "USDC",
    "protectedAssets": ["ETH"],
    "priority": "damage-minimization"
  }
  ```

### B. Portfolio Scanner
Queries live balances and associates risk metrics:
- Native assets (OKB) = **LIVE** balance.
- Verified ERC-20 assets = **LIVE** balance (none currently verified on testnet).
- Unverified ERC-20 assets = **UNVERIFIED / DEMO** balance.
- Volatility, change, and note properties are loaded as estimated metadata.

### C. Rescue Solver & Route Evaluation
Generates liquidation weight configurations ($w_i \in [0, 1]$) representing the fraction of each asset to sell. Calculates the output USDC:
$$\text{Expected Output} = \sum (w_i \times \text{Balance}_i \times \text{Price}_i \times (1 - \text{Slippage}_i))$$
Candidate routes with slippage $> 3\%$ or price impact $> 5\%$ are flagged and rejected.

### D. Planning & Verification
Demo rescue plans use labelled simulated route parameters. Authenticated OKX routing functions target X Layer Mainnet (196) and are not used as testnet calldata. The browser wallet may separately sign an optional X Layer Testnet verification transaction.

### E. Protection Score
A dynamic rating metric (0-100) indicating portfolio health:
$$\text{Score} = f(\text{Liquidity}, \text{Slippage}, \text{Gas}, \text{Safety}, \text{Market Impact})$$

---

## 12. Live vs. Demo Data Architecture
- **Invariants**: real blockchain assets must use `"dataSource": "live"`. Demo or unverified assets must use `"dataSource": "demo"` or `"dataSource": "unverified"`.
- **RPC Offline Handling**: If the public node goes down, the application changes its header status to `Demo Mode (RPC Offline)` and uses estimated fallback mock portfolios. Real wallet states are never faked under a successful status label.
- **Price Classification**: All token prices are currently classified as `estimated` fixture data.

---

## 13. Security Requirements
- **No Client Secrets**: API keys, passphrase, and HMAC signing keys must remain on the server.
- **No Client Private Keys**: The application must never store, import, or manage user private keys. All transactions must be sent to the user's browser wallet for manual signature/approval.
- **Secure RPC URLs**: Dedicated RPC endpoints containing API keys must never be exposed to client-side bundles or browser requests.

---

## 14. MVP Scope & Non-Goals
- **In-Scope**:
  - Connect wallet, switch/add X Layer Testnet.
  - Scan native OKB and demo/unverified assets.
  - Conversational intent box.
  - Multi-asset solver rendering Plan A, B, and C.
  - Transaction simulation timeline.
  - Live OKB execution/broadcast where supported on-chain.
  - Dynamic Protection Score updates.
- **Non-Goals (Out of Scope)**:
  - Automating swaps via cron jobs.
  - Multi-chain portfolio scanning (X Layer focus only).
  - Executing transactions using server-held private keys.

---

## 15. Hackathon Narrative & Judging Story
SAVE targets the "UX and Security" track. The core pitch to judges is:
> "SAVE changes how users manage risk. Instead of panic-swapping token-by-token during a crash, users tell their wallet their goal (e.g. 'Get me $700 USDC, protect my ETH'). SAVE scans liquidity, calculates the safest exit path on X Layer using OKX OnchainOS, and secures their capital in a single transaction."

---

## 16. Post-Hackathon & Monetization
- **Monetization**: Introduce a micro-percentage fee (e.g. 0.05%) on executed exits, or a premium subscription for institutional/vault automatic exit triggers.
- **Roadmap**: Integrate cross-chain liquidity bridges (e.g. OKX Bridge), support automatic vault protection policies, and license the solver to Web3 wallets as an native "Emergency Exit" button.

---
*Authoritative document version: 1.0.0 (Anti-Drift Locked)*
