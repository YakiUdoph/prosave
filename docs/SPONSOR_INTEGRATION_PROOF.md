# SAVE — Sponsor Integration Proof

This document provides technical evidence demonstrating the native integration of **OKX OnchainOS/Web3 Infrastructure** and the **X Layer Testnet** within the SAVE application.

---

## Why OKX + X Layer

SAVE solves a portfolio-level decision problem under asset-preservation constraints. DEX routers optimize individual pairs; SAVE determines which holdings to sell or protect and compares the resulting portfolio damage.

SAVE retains authenticated **OKX OnchainOS Web3 API** infrastructure for balances and X Layer Mainnet (chain 196) routing, approval, and transaction assembly. The current testnet rescue planner uses labelled simulated route parameters; mainnet payloads are never submitted on testnet 1952.

Deploying on **X Layer** provides the low-fee, high-throughput EVM consensus environment required to verify recovery transactions. Using native **OKB** for gas, X Layer ensures transaction verification is secure, fast, and transparent.

---

## Integration Map

| Sponsor / Infrastructure | SAVE Usage | Implementation Reference | Status |
| --- | --- | --- | --- |
| **OKX OnchainOS Web3 API** | Multi-chain token balance scans | [`okx.server.ts:L480`](file:///C:/Users/PC/Desktop/SAVE-XLayer/src/lib/okx.server.ts#L480-L487) | **LIVE** |
| **OKX OnchainOS Web3 API** | Mainnet quote calculation & exactIn convergence adapter | [`okx.server.ts:L239`](file:///C:/Users/PC/Desktop/SAVE-XLayer/src/lib/okx.server.ts#L239-L286) | **AVAILABLE / NOT IN TESTNET RESCUE RUNTIME** |
| **OKX OnchainOS Web3 API** | Mainnet approval transaction adapter | [`okx.server.ts:L366`](file:///C:/Users/PC/Desktop/SAVE-XLayer/src/lib/okx.server.ts#L366-L397) | **AVAILABLE / NOT BROADCAST** |
| **OKX OnchainOS Web3 API** | Mainnet swap transaction adapter | [`okx.server.ts:L402`](file:///C:/Users/PC/Desktop/SAVE-XLayer/src/lib/okx.server.ts#L402-L438) | **AVAILABLE / NOT BROADCAST** |
| **X Layer Testnet** | RPC client node querying (balances/confirmations) | [`xlayer.ts:L46`](file:///C:/Users/PC/Desktop/SAVE-XLayer/src/lib/xlayer.ts#L46-L52) | **LIVE** |
| **X Layer Testnet** | Optional X Layer Wallet Verification broadcast and receipt | [`execution.ts:L113`](file:///C:/Users/PC/Desktop/SAVE-XLayer/src/lib/execution.ts#L113-L187) | **OPTIONAL LIVE TESTNET TRANSACTION** |
| **OKX Wallet** | Preferred provider discovery & connection | [`save-context.tsx:L185`](file:///C:/Users/PC/Desktop/SAVE-XLayer/src/lib/save-context.tsx#L185-L220) | **LIVE** |

---

## OKX Integration

SAVE calls the OKX Web3 DEX API using a secure server function boundary (`src/lib/okx.server.ts`) to prevent client-side credential exposure.

* **Portfolio Scanner (`serverGetAllTokenBalances`)**: Fetches all token holdings and valuations across L2 networks by querying the OKX DEX balance API.
* **ExactIn Solver Quote (`getLiveQuote`)**: Evaluates rate parameters, slippage, and price impact.
* **Iterative Convergence (`convergeExactIn`)**: Numerically solves exact swap amounts needed to cover the user's recovery target.
* **Transaction Assembly (`getOkxSwapTransaction` & `getOkxApproveTransaction`)**: Prepared payload hashes are returned to the client browser securely.

---

## X Layer Integration

SAVE enforces active constraints verification on **X Layer Testnet (Chain ID 1952 / 0x7A0)**:

* **Chain Switching**: Checks network parameters upon connection. If the active network is not X Layer, it prompts a switch request to `0x7A0` ([`save-context.tsx:L270`](file:///C:/Users/PC/Desktop/SAVE-XLayer/src/lib/save-context.tsx#L270-L295)).
* **Gas Reserve Check**: Checks that native OKB balances exceed `0.001 OKB` before permitting live transaction prompts.
* **On-Chain Broadcast**: Passes the transaction hash returned from the injected wallet to the public RPC client (`publicClient` in [`xlayer.ts`](file:///C:/Users/PC/Desktop/SAVE-XLayer/src/lib/xlayer.ts#L46)).
* **Receipt Polling**: Polls the block header confirmations using `publicClient.getTransactionReceipt` until the transaction settles ([`save-context.tsx:L713`](file:///C:/Users/PC/Desktop/SAVE-XLayer/src/lib/save-context.tsx#L713-L753)).

---

## Execution Reality
 
To guarantee audit integrity, SAVE separates execution statuses clearly:
 
1. **`LIVE_WALLET` (Data Mode)**: Displays real balances, contracts, and prices from the connected address.
2. **`WATCH_ONLY` (Data Mode)**: Analyzes a pasted public EVM address in read-only mode, avoiding any key exposure or wallet connection request.
3. **`DEMO_PORTFOLIO` (Data Mode)**: A synthetic portfolio representing multiple risky holdings (e.g. PEPE, TKX) used to demonstrate complex solver decisions.
4. **X Layer Wallet Verification**: Optional native OKB self-transfer proving wallet authorization and block settlement. It is independent from rescue execution state.
5. **`DEMO_SIMULATION` (Execution Mode)**: Runs the solver against the selected plan to verify outputs locally. **Demo execution locks block MetaMask/OKX prompts, preventing mock transactions from being sent to real chains.**
 
---
 
## Security Model
 
* **Non-Custodial**: SAVE never generates, stores, or accesses private keys. All transactions are composed on the server and signed manually by the user's connected wallet.
* **Server-Side HMAC-SHA256 Signing**: OKX API credentials (`OKX_API_KEY`, `OKX_SECRET_KEY`) are stored in Vercel environment variables. Outgoing HTTP requests are signed with timestamped HMAC headers, isolating credentials from the client-side bundle.
* **Account Revalidation**: Re-verifies connected addresses immediately before requesting signatures to prevent address mismatch exploits.
* **Watch-Only Execution Lock**: In `WATCH_ONLY` mode, execution is locked behind a "WALLET AUTHORIZATION REQUIRED" CTA.
* **Mismatched Address Guard**: If a connected wallet's address does not match the watched address under active analysis, signature requests are blocked with a warning.

---

## Judge Verification Steps

Follow these steps to test SAVE's native integrations:

1. Open [SAVE](https://prosave.vercel.app), click **Connect Wallet**, and select your EVM wallet (OKX Wallet preferred).
2. Confirm the network switch prompt to switch network to **X Layer Testnet (Chain ID 1952)**.
3. Verify your live address scans. In **Intent**, type: `"Get me $700 USDC. Keep my ETH."`
4. Click **Run this intent on Demo Portfolio** (since testnet wallets generally won't hold $700 USDC, we use synthetic assets to calculate recovery routes).
5. Progress to plan validation and optionally click **Verify Wallet on X Layer Testnet**.
6. Sign the native OKB transfer request in your wallet, and watch the receipt status update dynamically as SAVE polls X Layer block receipts.

---

## 30-Second Technical Pitch

> *"DEX routers answer how to swap one pair. SAVE answers which portfolio assets should be sold or protected to reach a goal with the least policy-adjusted damage. Supported X Layer Mainnet actions use read-only OKX quotes when available; derived and demo estimates remain explicit, rescue execution stays simulated, and X Layer Testnet separately proves optional wallet authorization and settlement."*

---

## Judge Talking Points

### 1. Why OKX OnchainOS?

SAVE uses the OKX OnchainOS read-only quote API for supported X Layer Mainnet identities. Exact action responses, OKX-derived estimates, and demo fallbacks are displayed separately; no quote is presented as an executed or executable rescue route.

### 2. Why X Layer?
X Layer Testnet provides the wallet authorization and settlement-verification environment for the current MVP. Its native OKB gas token supports public balance checks and the optional verification transaction.

### 3. What is actually live today?
Today, SAVE connects to OKX Wallet and MetaMask, scans balances via OKX/RPC where available, and plans simulated portfolio rescues. Separately, users may sign an optional X Layer Testnet wallet-verification transaction; its receipt proves authorization and settlement only, not rescue execution.
