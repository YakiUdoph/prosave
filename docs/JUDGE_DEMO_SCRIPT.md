# SAVE — Final Hackathon Judge Demo Script

This document serves as the official, step-by-step presentation script for hackathon video recording and live judge evaluations. It aligns precisely with the deployed product state on [prosave.vercel.app](https://prosave.vercel.app).

---

## Deployed Product Journey & Timeline

* **Target Video Duration**: 2 minutes 15 seconds to 2 minutes 45 seconds
* **Target Audience**: OKX / X Layer Hackathon Judges

---

### Segment 1: Hook & The Problem
* **Timestamp**: `0:00 – 0:15`
* **Screen**: **Overview** (`/` - Homepage)
* **Action / Click**: None (passive presentation of the home page).
* **What User Sees**: A premium dark-mode interface displaying: *"AI Portfolio Rescue Agent. Exit volatile assets on your terms, without manual route compilation."*
* **Narration**: 
  > *"Crypto users think in outcomes. DeFi makes them think in transactions. When a black swan event hits, liquidating a complex, multi-chain portfolio to secure a stablecoin target while preserving high-conviction assets requires calculating slippage, allowances, and routing manually. This friction leads to devastating losses."*
* **Judge Takeaway**: Traditional DEX aggregators operate at the transaction level; they cannot reason about a user's high-level portfolio outcomes or capital preservation constraints during a rescue.

---

### Segment 2: Product Thesis
* **Timestamp**: `0:15 – 0:30`
* **Screen**: **Overview** (`/` - Homepage)
* **Action / Click**: Hover over the logo and elements to demonstrate responsiveness, then click **[Connect Wallet]** (top right or main CTA).
* **What User Sees**: Handshake page (`/connect`) showing three options: *OKX Wallet*, *WalletConnect*, and *Browser Wallet*.
* **Narration**: 
  > *"SAVE introduces the AI Portfolio Rescue Agent. It acts as an intent-driven reasoning layer that sits above liquidity sources. Instead of trading token by token, the user defines a target outcome in plain language. SAVE handles route scoring, gas reserves, spender allowance verification, and consensus execution."*
* **Judge Takeaway**: SAVE is an intelligence layer that optimizes portfolio-level outcomes rather than individual swaps.

---

### Segment 3: Public Address Scan & Watch-Only Security
* **Timestamp**: `0:30 – 0:50`
* **Screen**: **Connect Wallet** (`/connect` -> `/scan`)
* **Action / Click**: Instead of connecting, paste a public EVM address in the "Prefer not to connect?" input panel and click **[Scan address]**. Watch scan screen load.
* **What User Sees**: Scanning animation resolving to the watch-only wallet assets screen. A header banner explicitly says "WATCH-ONLY PORTFOLIO" showing public address scan with no signing permission granted.
* **Narration**: 
  > *"SAVE values user autonomy and security. A user can analyze a public wallet address in read-only mode without connecting a wallet, signing messages, or sharing keys. If a scanned wallet is sparse, SAVE detects this and warns us. But to demonstrate how the rescue solver handles complex portfolios, we can cycle directly to the Demo Portfolio."*
* **Judge Takeaway**: Wallet connection is only required when signing on-chain validation transactions, while public scans remain fully sandboxed and read-only.

---

### Segment 4: Demo Portfolio & Intent
* **Timestamp**: `0:50 – 1:10`
* **Screen**: **Portfolio Scan** (`/scan` -> `/command` -> `/intent`)
* **Action / Click**: Click **[Switch to Demo Mode]** on the navbar, click **[Enter Command Center]**, click **[Tell SAVE what you need]** (bottom right CTA). Type in the box: `"Get me $700 USDC. Don't sell my ETH unless necessary."` Click **[Generate Rescue Plan]**.
* **What User Sees**: The Intent Parser extracting constraints in real time: Target: `700 USDC`, Protected: `ETH`, Objective: `Minimum portfolio damage`, Policy: `Sell ETH only as last resort`.
* **Narration**: 
  > *"Our sample portfolio simulates 15 distinct assets across 5 EVM networks, including Ethereum, Base, and X Layer. I tell SAVE in plain language: 'Get me $700 USDC. Don't sell my ETH unless necessary.' The intent parser extracts the constraints, determines which assets are protected, and queries the OKX DEX aggregator."*
* **Judge Takeaway**: SAVE converts natural language intent into deterministic execution rules and queries live routing data.

---

### Segment 5: Rescue Plans & Solver Heuristics
* **Timestamp**: `1:10 – 1:35`
* **Screen**: **Optimized Rescue Plan** (`/plan`)
* **Action / Click**: Click through **Plan A**, **Plan B**, and **Plan C** on the right. Expand **[Compare Rescue Strategies]** table to show parameters.
* **What User Sees**: Three candidates scored dynamically. Plan B is highlighted with a score of `90` (recommended). Detail shows it liquidates volatile `TKX` first, preserves `ETH` 100%, and uses OKX DEX routes.
* **Narration**: 
  > *"Instead of offering a single option, the solver generates three distinct plans. Plan A prioritizes speed, liquidating high-liquidity assets. Plan C is defensive. Plan B is our recommended strategy: it scores a 90 by fully preserving our protected ETH, avoiding slippage, and liquidating 100% of our high-risk TKX exposure. A DEX aggregator optimizes one route; SAVE decides which assets should be touched at all."*
* **Judge Takeaway**: SAVE’s scoring engine evaluates slippage, asset risk profiles, and gas budgets to recommend the plan with the lowest capital damage.

---

### Segment 6: Simulation & OKX Telemetry
* **Timestamp**: `1:35 – 1:55`
* **Screen**: **Simulation Status** (`/simulate`)
* **Action / Click**: Click **[Simulate plan B]**. Let the timeline checks complete. Scroll to show the **Infrastructure Telemetry** panel.
* **What User Sees**: Safety check timeline executing: wallet chain validation, quote age freshness check, and allowance verification. Spender addresses marked as `VERIFIED_OKX` via server-side signatures.
* **Narration**: 
  > *"Before signing, SAVE runs the plan through local safety gates. We check gas reserve sufficiency, quote freshness, and allowance spenders. In watch-only mode, execution is locked. If we connect a wallet, SAVE verifies that the connected address matches our scanned portfolio; if they differ, it blocks execution with a mismatch warning."*
* **Judge Takeaway**: SAVE utilizes OKX OnchainOS infrastructure for routing intelligence while wrapping it in localized safety guardrails and multi-mode signature gates.

---

### Segment 7: X Layer Live Verification
* **Timestamp**: `1:55 – 2:20`
* **Screen**: **Simulation Status** (`/simulate` -> `/protected`)
* **Action / Click**: Click **[Authorize Rescue Plan]**. Wallet window opens. Sign the native OKB transfer request. Watch timeline poll RPC and navigate to success page.
* **What User Sees**: Loading state transitioning to `/protected`. The page displays: **RESCUE OUTCOME: SIMULATED** and **X LAYER VERIFICATION: TESTNET_LIVE**, followed by a live X Layer receipt showing the transaction hash, gas used, and block number.
* **Narration**: 
  > *"Now, I click Authorize. While the complex multi-chain rescue is simulated, SAVE triggers a live verification transaction on the X Layer Testnet. This is a 0.0001 OKB self-transfer that tests the EIP-1193 sign-and-broadcast pipeline. Once confirmed, SAVE polls X Layer block headers and displays our live receipt, including the real transaction hash and gas consumed."*
* **Judge Takeaway**: SAVE maintains high integrity, separating simulated liquidation outcomes from live, user-authorized testnet verification transactions.

---

### Segment 8: Closing
* **Timestamp**: `2:20 – 2:45`
* **Screen**: **Rescue Complete** (`/protected`)
* **Action / Click**: Hover over **[Back to command center]** and click it to complete the loop.
* **What User Sees**: Return to the main Command Center dashboard.
* **Narration**: 
  > *"With SAVE, users no longer need to navigate fragmented L2 protocols or manually compile trade routes. Tell SAVE where your portfolio needs to end up. SAVE finds the safest path. DEX aggregators optimize swaps. SAVE optimizes portfolio outcomes. Thank you."*
* **Judge Takeaway**: SAVE is a complete, institutional-grade, intent-driven rescue engine natively powered by OKX and X Layer.

---

## 30-Second Technical Explanation

> *"SAVE is an intent-driven emergency exit engine built on OKX OnchainOS and X Layer. When a user inputs a natural language goal, the parser extracts target variables and preservation rules. The solver queries OKX DEX routing APIs via secure server functions signed with HMAC-SHA256 headers, returning optimized trade payloads. Before requesting wallet signatures, SAVE runs the plan through safety gates checking gas limits, quote freshness, and contract spenders. Once authorized, the simulated rescue is accompanied by a live, user-signed verification transaction on X Layer Testnet (Chain ID 1952), polled via RPC block headers to confirm settlement."*

---

## Likely Judge Questions

### 1. What is actually AI here?
The AI component is the **Natural-Language Intent Parser**. It uses a rule-based deterministic classifier to extract structured recovery targets, target assets, protected tokens, and preservation policies from raw user queries without introducing black-box unpredictability into transaction routing.

### 2. Why not just use a DEX aggregator?
DEX aggregators are designed to swap single token pairs (e.g., ETH to USDC). They cannot evaluate portfolio-level risk, prioritize liquidations based on token volatility, or respect user constraints (e.g., 'preserve my ETH while liquidating PEPE'). SAVE is the portfolio brain; DEX aggregators are the execution legs.

### 3. Why OKX?
OKX OnchainOS Web3 DEX APIs provide the industry-leading route aggregation, liquidity depth analysis, and raw transaction assembly (approvals and swaps). SAVE utilizes OKX's developer endpoints to ensure that our solver’s candidates are backed by executable pricing and real liquidity.

### 4. Why X Layer?
X Layer provides the low-fee, high-performance EVM consensus network needed to execute emergency portfolio rescues. Its native gas token, OKB, integrates directly with our RPC gas budgeting verification gates, checking native balances before prompting the wallet.

### 5. What is actually live?
All wallet connection handshakes, live portfolio balance scanning (via X Layer RPC and OKX balance APIs), gas reserves verification, and EIP-1193 signature prompts are live. The final execution broadcasts a live verification transaction on the X Layer Testnet, confirming the block receipt parameters in real time.

### 6. Why use a Demo Portfolio?
Since hackathon judges usually connect empty testnet wallets containing only native OKB gas, scanning only the live wallet would return insufficient assets to calculate realistic $700 rescue strategies. The Demo Portfolio allows judges to evaluate the multi-asset solver while keeping live and demo modes explicitly separated in the UI.

### 7. Is SAVE custodial?
No. SAVE is completely non-custodial. It never requests seed phrases, generates private keys, or performs background auto-broadcasts. Every action composed by SAVE requires explicit user authorization and signing via browser extensions (MetaMask or OKX Wallet).

### 8. Can SAVE execute without user approval?
No. Every step of a rescue plan (swaps and ERC-20 contract approvals) is staged sequentially. The user must manually approve each transaction prompt in their browser wallet.

### 9. What happens if the target cannot be met?
If the portfolio value (excluding protected assets) is insufficient to satisfy the target amount under current liquidity conditions, the solver marks the plans as infeasible and prompts the user to either modify their target or run the strategy using the Demo Portfolio.

### 10. What happens next after the hackathon?
We plan to integrate OKX OnchainOS on X Layer Mainnet (Chain ID 196) and implement Infura/Ankr RPC fallback networks. We will also add a state manager that records transaction receipts locally to prevent double-swaps if a user closes their browser mid-rescue.

---

## Recording Setup Checklist

- [ ] Deployed production URL loaded: `https://prosave.vercel.app`.
- [ ] No browser developer console or warning panels open.
- [ ] Injected wallet (OKX Wallet or MetaMask) connected and set to **X Layer Testnet (Chain ID 1952 / 0x7A0)**.
- [ ] Native OKB balance in the testnet wallet is `> 0.001 OKB` (to satisfy the RPC gas check).
- [ ] Demo Mode pre-tested and active.
- [ ] Intent query copied to clipboard: `"Get me $700 USDC. Don't sell my ETH unless necessary."`
- [ ] Browser zoom adjusted to 100% or 110% for clear readability.
- [ ] Browser notifications, bookmarks bar, and unrelated background tabs hidden/muted.
- [ ] Cursor movements are slow, smooth, and deliberate (no erratic shaking).
- [ ] Voice matches action clicks with a 1-second buffer.

---

## Backup Demo Plan

* **If wallet connection fails**: Skip the live scan, explain the non-custodial flow, and click **[Switch to Demo Mode]** in the navigation bar to run the entire solver simulation.
* **If X Layer RPC goes offline**: Show the pre-compiled [`docs/SPONSOR_INTEGRATION_PROOF.md`](file:///c:/Users/PC/Desktop/SAVE-XLayer/docs/SPONSOR_INTEGRATION_PROOF.md) showing verified block receipts, and continue the demo on the simulated timeline.
* **If the OKX API returns error limits**: Continue the walkthrough utilizing the high-fidelity mock fallback configurations embedded in `okx.server.ts` and `xlayer.ts` to evaluate the scoring engine.
