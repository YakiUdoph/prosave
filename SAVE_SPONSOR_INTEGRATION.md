# SAVE: Sponsor Integration & Architecture Map

This document maps the native usage of sponsor technologies (X Layer and OKX OnchainOS) within SAVE, detailing how they are essential to solving the portfolio protection problem.

---

## 🗺️ Sponsor Integration Matrix

| SAVE Capability | Sponsor Technology | Role / Utility | Status | Demo Proof |
| :--- | :--- | :--- | :--- | :--- |
| **Gas Asset Exits** | **X Layer Testnet** | Hosts the core portfolio holdings, native OKB gas tokens, and executes rescue transactions. | **VALIDATED** | On-chain balance scans read native OKB balances via RPC. |
| **Liquidity & Routing** | **OKX OnchainOS (DEX Router)** | Resolves multi-asset routing paths, gas estimates, and slippage-optimized swap details. | **VALIDATED** | HMAC-SHA256 signature requests successfully retrieve chain/token quote parameters. |
| **Transaction Execution** | **X Layer RPC / Wallet** | Submits compiled multi-swap transaction bundles to the user's connected wallet for signature. | **PLANNED** | Client wallet prompts switch to X Layer Testnet and signs swap txs. |
| **Safe Exit Guards** | **OKX Aggregator API** | Evaluates price impact and slippage parameters to reject unsafe routes before execution. | **VALIDATED** | Gate E tests successfully rejected quotes exceeding threshold limits (11.5% impact). |

---

## 🔍 Deep Dive: Core Sponsor Integrations

### 1. X Layer (Base Ledger & Gas Token)
- **Role**: X Layer is the settlement layer where all user assets reside. Its fast block times and low transaction fees are critical for quick, emergency liquidations during high-volatility events. Native OKB serves as the gas asset.
- **Why it matters**: During a market sell-off, high-fee networks like Ethereum Mainnet can price out average retail users. X Layer ensures that emergency exits remain cheap and fast.

### 2. OKX OnchainOS (DEX Router & Liquidity Aggregator)
- **Role**: Provides the global liquidity mapping. The SAVE Rescue Solver queries OKX OnchainOS to obtain the best swap rates, gas requirements, and slippage coefficients for every asset in the portfolio.
- **Why it matters**: Traditional DEX APIs only provide simple, single-token routing. OKX OnchainOS aggregates liquidity across the entire L2 ecosystem, ensuring the Rescue Solver has the most accurate data to formulate its damage-minimization exit plans.

---

## 🛡️ "What would SAVE lose without this sponsor technology?"
This section provides clear, defensible arguments for hackathon judges showing why X Layer and OKX OnchainOS are fundamental to SAVE, rather than just simple bolt-on additions:

1. **Without OKX OnchainOS**:
   - SAVE would lose the ability to calculate global portfolio-level damage. We would have to query separate DEX routers (e.g. Uniswap, QuickSwap) manually on the client, which would multiply RPC request overhead, fail to aggregate multi-hop split routes, and result in highly inefficient, high-slippage exit paths during critical liquidations.
   - SAVE's Route validation would have no central source of truth for slippage and price impact, leading to transaction reverts, front-running losses, and lost user capital.

2. **Without X Layer**:
   - The gas overhead of executing multiple consecutive swap transactions on a L1 chain would wipe out the liquidity saved by the solver.
   - During high congestion, transaction queues would delay the rescue path, causing significant asset devaluation. X Layer's high throughput ensures the calculated rescue parameters remain valid at the moment of execution.

## 📐 SAVE Solver vs. OKX Routing Architecture
OKX and SAVE operate in separate, complementary domains:
1. **OKX OnchainOS DEX Router**: Solves the single-pair route optimization problem: *"How can we swap asset A to asset B with the lowest slippage and price impact?"*
2. **SAVE Rescue Solver**: Solves the global portfolio liquidation problem: *"Given the user's natural language intent, target stable amount, protected assets, and risk profiles, which assets should be sold, in what order, and what portion of their balances should be liquidated?"*

### Exact-In Iterative Solver Integration
Because the OKX DEX Router API on X Layer primarily supports `exactIn` quotes, SAVE implements a bounded, iterative numerical search to satisfy exact stablecoin outputs (e.g. $700 USDC).
- **Process**:
  1. The solver calculates an initial input estimate based on asset prices.
  2. Query OKX `exactIn` quote to obtain the expected output.
  3. Correct the input using a bounded binary search (upper limit capped at 1.5x initial estimate, lower limit at 0.8x).
  4. Converges on the required target output within a tolerance threshold of $\$0.05$ over a maximum of 5 iterations.
- **Fail-Safe Fallback**: If live quotes timeout or fail, the solver gracefully logs the API error and switches to the deterministic local mock router, ensuring the application remains responsive.

### Gas Model & Native Gas Reserves
In EVM networks like X Layer, executing transactions requires native OKB gas. Exhausting 100% of the wallet's native OKB to satisfy a swap target would leave the wallet bricked and incapable of executing the swaps.
- **Gas Capping**:
  - The solver estimates the USD gas cost of the proposed actions and converts it to native gas: `requiredGasOKB = totalGasUsd / nativeGasPrice`.
  - Capped OKB Sellable Balance: `maxSellableOKB = Math.max(0, startingOKB - (requiredGasOKB * safetyMultiplier))`.
  - The `safetyMultiplier` is set to `1.2` to account for dynamic network fee changes and potential ERC-20 approval transaction gas fees.
- **Feasibility Gate**: If starting OKB is less than `requiredGasOKB * safetyMultiplier`, the plan is flagged with `INSUFFICIENT_GAS_RESERVE`.

### Environment and Provenance Boundaries
To maintain strict development integrity during the hackathon:
- **X Layer Testnet (Chain ID 1952)**: Used for reading native balances from the connected browser wallet, switching networks, and simulating/executing transactions.
- **OKX OnchainOS (Chain Index 196)**: Used to query live mainnet tokens (USDC contract: `0x74b7F...`, WETH contract: `0x5A77f...`) and real DEX routing configurations.
- **Provenance Labeling**: All data cards and simulated timeline rows carry explicit `source` markers (`LIVE_OKX`, `LIVE_RPC`, `DEMO`) so that mock fixtures and live data are never silently or misleadingly merged.

---

## 🚦 Integration Status Definitions
- **VALIDATED**: Technical connectivity and responses have been successfully tested locally on this machine/IP.
- **IMPLEMENTED**: Code is fully integrated into the active workspace.
- **PLANNED**: Integration is mapped and ready to build in the roadmap.
- **DEMO**: Integration is simulated for the hackathon UI flow.
- **BLOCKED**: Technical blockers currently prevent integration.
