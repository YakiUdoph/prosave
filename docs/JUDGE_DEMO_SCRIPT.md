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
* **What User Sees**: A premium dark-mode interface presenting an intent-driven natural-language portfolio policy engine.
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
  > *"SAVE is an intent-driven decision layer above liquidity routers. Instead of choosing token-by-token swaps, the user defines a portfolio outcome. SAVE deterministically extracts constraints, compares rescue strategies, and scores the least-damaging feasible path."*
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
  > *"Our sample portfolio simulates 15 assets across five EVM networks. The deterministic parser extracts the target and protection policy, then the solver compares portfolio-level strategies using explicitly simulated route parameters."*
* **Judge Takeaway**: SAVE converts natural-language intent into deterministic portfolio rules without presenting demo estimates as live quotes.

---

### Segment 5: Rescue Plans & Solver Heuristics
* **Timestamp**: `1:10 – 1:35`
* **Screen**: **Optimized Rescue Plan** (`/plan`)
* **Action / Click**: Click through **Plan A**, **Plan B**, and **Plan C** on the right. Expand **[Compare Rescue Strategies]** table to show parameters.
* **What User Sees**: Three candidates scored dynamically. The recommended plan is highlighted. Its detail shows which simulated liquidations preserve protected assets while meeting the target.
* **Narration**: 
  > *"Instead of offering a single option, the solver generates three distinct plans. Plan A prioritizes speed, liquidating high-liquidity assets. Plan C is defensive. Plan B is our recommended strategy: it scores a 90 by fully preserving our protected ETH, avoiding slippage, and liquidating 100% of our high-risk TKX exposure. A DEX aggregator optimizes one route; SAVE decides which assets should be touched at all."*
* **Judge Takeaway**: SAVE’s scoring engine evaluates slippage, asset risk profiles, and gas budgets to recommend the plan with the lowest capital damage.

---

### Segment 6: Simulation & OKX Telemetry
* **Timestamp**: `1:35 – 1:55`
* **Screen**: **Simulation Status** (`/simulate`)
* **Action / Click**: Click **[Simulate plan B]**. Let the timeline checks complete. Scroll to show the **Infrastructure Telemetry** panel.
* **What User Sees**: Local plan-validation checks covering portfolio feasibility, estimate freshness, protected-asset policy, estimated gas, and approval requirements.
* **Narration**: 
  > *"SAVE validates the simulated plan locally: target feasibility, estimate freshness, protected-asset policy, estimated gas, and anticipated approval requirements. The authenticated OKX chain-196 adapter remains available as mainnet reference infrastructure; its payloads are not used in this testnet rescue."*
* **Judge Takeaway**: SAVE separates deterministic portfolio planning and simulated route estimates from its available OKX mainnet adapter infrastructure.

---

### Segment 7: X Layer Wallet Verification
* **Timestamp**: `1:55 – 2:20`
* **Screen**: **Simulation Status** (`/simulate` -> `/protected`)
* **Action / Click**: While remaining in Demo Portfolio mode, connect a real wallet with **[Connect Wallet for Optional X Layer Verification]** if needed. Then optionally click **[Verify Wallet on X Layer Testnet]**, authorize the disclosed 0.0001 OKB self-transfer, and click **[View Simulated Result]**.
* **What User Sees**: **RESCUE OUTCOME: SIMULATED** remains unchanged. A separate **X LAYER WALLET VERIFICATION: CONFIRMED** receipt shows transaction hash, gas, and block number.
* **Narration**: 
  > *"The rescue stays simulated. Separately, this optional 0.0001 OKB self-transfer verifies wallet authorization, X Layer Testnet selection, broadcast, and settlement. It does not execute or advance the rescue strategy."*
* **Judge Takeaway**: SAVE maintains high integrity, separating simulated liquidation outcomes from live, user-authorized testnet verification transactions.

---

### Segment 8: Closing
* **Timestamp**: `2:20 – 2:45`
* **Screen**: **Simulated Rescue Outcome** (`/protected`)
* **Action / Click**: Hover over **[Back to command center]** and click it to complete the loop.
* **What User Sees**: Return to the main Command Center dashboard.
* **Narration**: 
  > *"With SAVE, users no longer need to navigate fragmented L2 protocols or manually compile trade routes. Tell SAVE where your portfolio needs to end up. SAVE finds the safest path. DEX aggregators optimize swaps. SAVE optimizes portfolio outcomes. Thank you."*
* **Judge Takeaway**: SAVE is a complete, institutional-grade, intent-driven rescue engine natively powered by OKX and X Layer.

---

## 30-Second Technical Explanation

> *"SAVE deterministically extracts portfolio targets and protection rules, compares scored rescue strategies using simulated route estimates, and validates feasibility and policy locally. Authenticated OKX chain-196 routing adapters remain available as mainnet reference infrastructure. Separately, users may authorize a 0.0001 OKB self-transfer for X Layer Wallet Verification; its receipt proves wallet authorization and X Layer Testnet settlement, not rescue execution."*

---

## Likely Judge Questions

### 1. What is actually AI here?
The current runtime does not use an AI model. It uses a deterministic natural-language constraint parser. AI-assisted interpretation is a future product direction behind the same validated schema.

### 2. Why not just use a DEX aggregator?
DEX aggregators are designed to swap single token pairs (e.g., ETH to USDC). They cannot evaluate portfolio-level risk, prioritize liquidations based on token volatility, or respect user constraints (e.g., 'preserve my ETH while liquidating PEPE'). SAVE is the portfolio brain; DEX aggregators are the execution legs.

### 3. Why OKX?
SAVE includes authenticated OKX Web3 balance and X Layer Mainnet routing adapters. Because OKX routing support is chain 196 while SAVE remains on testnet 1952, demo candidates use labelled simulated parameters and no mainnet calldata is submitted on testnet.

### 4. Why X Layer?
X Layer provides the low-fee, high-performance EVM consensus network needed to execute emergency portfolio rescues. Its native gas token, OKB, integrates directly with our RPC gas budgeting verification gates, checking native balances before prompting the wallet.

### 5. What is actually live?
All wallet connection handshakes, live portfolio balance scanning (via X Layer RPC and OKX balance APIs), gas reserves verification, and EIP-1193 signature prompts are live. The final execution broadcasts a live verification transaction on the X Layer Testnet, confirming the block receipt parameters in real time.

### 6. Why use a Demo Portfolio?
Since hackathon judges usually connect empty testnet wallets containing only native OKB gas, scanning only the live wallet would return insufficient assets to calculate realistic $700 rescue strategies. The Demo Portfolio allows judges to evaluate the multi-asset solver while keeping live and demo modes explicitly separated in the UI.

### 7. Is SAVE custodial?
No. SAVE is completely non-custodial. It never requests seed phrases, generates private keys, or performs background auto-broadcasts. Every action composed by SAVE requires explicit user authorization and signing via browser extensions (MetaMask or OKX Wallet).

### 8. Can SAVE execute without user approval?
Rescue swaps are disabled on testnet and remain simulated. Only the separate optional wallet-verification diagnostic can request a signature, and it always requires explicit browser-wallet approval.

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
