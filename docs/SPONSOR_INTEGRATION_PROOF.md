# SAVE — Sponsor Integration Proof

This document provides technical evidence demonstrating the native integration of **OKX OnchainOS/Web3 Infrastructure** and the **X Layer Testnet** within the SAVE application.

---

## Why OKX + X Layer

SAVE is built to solve a critical Web3 recovery problem: optimizing portfolio-level exits under strict asset preservation constraints. Traditional DEX routers optimize individual token pairs without regard for overall portfolio risk, time horizons, or token preservation rules. SAVE serves as the intelligence layer, while OKX and X Layer provide the execution and consensus backbone.

By integrating with **OKX OnchainOS Web3 APIs**, SAVE offloads route discovery, quotes, and raw transaction payload assembly to OKX's high-performance aggregator network. This ensures that when the SAVE engine decides *which* assets must be traded to reach a target, the trade payloads are formed using real liquidity depth. 

Deploying on **X Layer** provides the low-fee, high-throughput EVM consensus environment required to verify recovery transactions. Using native **OKB** for gas, X Layer ensures transaction verification is secure, fast, and transparent.

---

## Integration Map

| Sponsor / Infrastructure | SAVE Usage | Implementation Reference | Status |
| --- | --- | --- | --- |
| **OKX OnchainOS Web3 API** | Multi-chain token balance scans | [`okx.server.ts:L480`](file:///C:/Users/PC/Desktop/SAVE-XLayer/src/lib/okx.server.ts#L480-L487) | **LIVE** |
| **OKX OnchainOS Web3 API** | Route quote calculation & exactIn convergence | [`okx.server.ts:L239`](file:///C:/Users/PC/Desktop/SAVE-XLayer/src/lib/okx.server.ts#L239-L286) | **LIVE** |
| **OKX OnchainOS Web3 API** | ERC-20 approval transaction payloads | [`okx.server.ts:L366`](file:///C:/Users/PC/Desktop/SAVE-XLayer/src/lib/okx.server.ts#L366-L397) | **LIVE** |
| **OKX OnchainOS Web3 API** | Swap transaction assembly payload | [`okx.server.ts:L402`](file:///C:/Users/PC/Desktop/SAVE-XLayer/src/lib/okx.server.ts#L402-L438) | **LIVE** |
| **X Layer Testnet** | RPC client node querying (balances/confirmations) | [`xlayer.ts:L46`](file:///C:/Users/PC/Desktop/SAVE-XLayer/src/lib/xlayer.ts#L46-L52) | **LIVE** |
| **X Layer Testnet** | EIP-1193 transaction broadcast & verification | [`execution.ts:L113`](file:///C:/Users/PC/Desktop/SAVE-XLayer/src/lib/execution.ts#L113-L187) | **TESTNET_LIVE** |
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
2. **`DEMO_PORTFOLIO` (Data Mode)**: A synthetic portfolio representing multiple risky holdings (e.g. PEPE, TKX) used to demonstrate complex solver decisions.
3. **`TESTNET_LIVE` (Execution Mode)**: Prompts a real transaction on X Layer Testnet (native OKB self-transfer) verifying wallet signing and block receipt confirmation.
4. **`DEMO_SIMULATION` (Execution Mode)**: Runs the solver against the selected plan to verify outputs locally. **Demo execution locks block MetaMask/OKX prompts, preventing mock transactions from being sent to real chains.**

---

## Security Model

* **Non-Custodial**: SAVE never generates, stores, or accesses private keys. All transactions are composed on the server and signed manually by the user's connected wallet.
* **Server-Side HMAC-SHA256 Signing**: OKX API credentials (`OKX_API_KEY`, `OKX_SECRET_KEY`) are stored in Vercel environment variables. Outgoing HTTP requests are signed with timestamped HMAC headers, isolating credentials from the client-side bundle.
* **Account Revalidation**: Re-verifies connected addresses immediately before requesting signatures to prevent address mismatch exploits.

---

## Judge Verification Steps

Follow these steps to test SAVE's native integrations:

1. Open [SAVE](https://prosave.vercel.app), click **Connect Wallet**, and select your EVM wallet (OKX Wallet preferred).
2. Confirm the network switch prompt to switch network to **X Layer Testnet (Chain ID 1952)**.
3. Verify your live address scans. In **Intent**, type: `"Get me $700 USDC. Keep my ETH."`
4. Click **Run this intent on Demo Portfolio** (since testnet wallets generally won't hold $700 USDC, we use synthetic assets to calculate recovery routes).
5. Progress to **Simulate**, verify safety guardrails, and click **Authorize Rescue Plan**.
6. Sign the native OKB transfer request in your wallet, and watch the receipt status update dynamically as SAVE polls X Layer block receipts.

---

## 30-Second Technical Pitch

> *"SAVE is not just another AI wrapper; it is an intent-driven emergency exit engine for Web3 portfolios. While traditional DEX aggregators optimize a single swap, SAVE uses OKX OnchainOS quote APIs to solve multi-asset, portfolio-level outcomes under user-defined constraints. Built natively for X Layer, SAVE checks gas reserves, verifies contract spenders, and simulates transactions on forked nodes before prompting the user's wallet. It proves live execution capability on the X Layer Testnet via secure EIP-1193 signing while preserving data honesty through isolated demo and live states."*

---

## Judge Talking Points

### 1. Why OKX OnchainOS?

OKX provides the industry-leading Web3 aggregator routing API. Instead of building custom routers and liquidity trackers, SAVE integrates OKX OnchainOS to retrieve real-time quotes, liquidity depth, and raw swap transaction payloads. This ensures that SAVE's portfolio decisions are backed by executable market routes.

### 2. Why X Layer?
X Layer offers the low latency and cost-effective block settlement required to execute emergency portfolio rescues. Its native OKB gas token integrates seamlessly with our wallet-checking logic, allowing us to read balances via RPC and verify that the user can cover transaction fees before requesting signatures.

### 3. What is actually live today?
Today, SAVE natively connects to OKX Wallet and MetaMask, scans live token balances via OKX, and queries X Layer RPC endpoints. When a user executes a plan, they sign and broadcast a live verification transaction on the X Layer Testnet, confirming the block receipt, gas consumed, and execution proof in real time.
