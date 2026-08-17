# SAVE Development Drift & Problem Log

This is an append-only log documenting architectural decisions, security resolutions, and verified technical limitations discovered during development. All future agents must review this list to avoid repeating past mistakes.

---

## 📋 Active Drift Entries

### DRIFT-001: Redesign Drift
- **Date**: 2026-08-17
- **Discovery**: A generic "cinematic" redesign altered the approved frontend visual hierarchy too aggressively, breaking alignment with the original visual source of truth.
- **Impact**: Lost core user flows and layout compositions approved by the product sponsor.
- **Root Cause**: Unmonitored styling changes during styling phase.
- **Resolution**: Visual baseline was locked in Git (`62663f3d377b3b51862ee2a26eed6f35dfb339e8`, tag `save-approved-ui-baseline`). Broad UI changes are strictly prohibited.
- **Files Affected**: Entire `src/` codebase.
- **Status**: **RESOLVED**

### DRIFT-002: Ankr RPC HTTP 403 Failure
- **Date**: 2026-08-17
- **Discovery**: The anonymous Ankr X Layer Testnet endpoint (`https://rpc.ankr.com/xlayer_testnet`) returned HTTP 403: *"API key is not allowed to access blockchain."*
- **Impact**: Caused RPC query errors and failed fallback runs.
- **Root Cause**: Ankr Testnet endpoints require paid/authenticated credentials on this development network/IP.
- **Resolution**: Removed the Ankr endpoint from the public transport list. Replaced it with the official X Layer Testnet public nodes.
- **Files Affected**: `src/lib/xlayer.ts`
- **Status**: **RESOLVED**

### DRIFT-003: Proposed WETH Address Bytecode Empty
- **Date**: 2026-08-17
- **Discovery**: Querying contract bytecode (`getBytecode`) for `0x5a77f1443d16ee5761d310e38b62f77f726bc71c` returned `0x` (empty).
- **Impact**: Token reads failed on-chain.
- **Root Cause**: The address does not host active smart contract bytecode on the public X Layer Testnet.
- **Resolution**: Classified the WETH asset as `unverified` and configured the client-side scanner to treat it as demo/unverified.
- **Files Affected**: `src/lib/xlayer.ts`
- **Status**: **RESOLVED**

### DRIFT-004: Proposed USDC Address Bytecode Empty
- **Date**: 2026-08-17
- **Discovery**: Querying contract bytecode (`getBytecode`) for `0xb6ceceab302e2e4948951ee7843fc24e92933061` returned `0x` (empty).
- **Impact**: Token reads failed on-chain.
- **Root Cause**: The address does not host active smart contract bytecode on the public X Layer Testnet.
- **Resolution**: Classified the USDC asset as `unverified` and configured the client-side scanner to treat it as demo/unverified.
- **Files Affected**: `src/lib/xlayer.ts`
- **Status**: **RESOLVED**

### DRIFT-005: Leak Risk of Private RPC Endpoint Tokens
- **Date**: 2026-08-17
- **Discovery**: Returning custom RPC endpoints loaded via server-side process environment variables (`XLAYER_RPC_URLS`) to client components exposes QuickNode API tokens in the browser client bundle/network inspector.
- **Impact**: Critical security vulnerability allowing unauthorized access to private RPC infrastructure.
- **Root Cause**: Passing environment RPC string lists directly through TanStack Start server functions to client hydration states.
- **Resolution**: Restricted client-side balance reads to use ONLY documented public X Layer nodes. Dedicated private nodes are configured strictly server-side for backend execution.
- **Files Affected**: `src/lib/xlayer.ts`
- **Status**: **RESOLVED**

### DRIFT-006: Validation Test Wallet Mismatch
- **Date**: 2026-08-17
- **Discovery**: Verification script checked balances against the zero address (`0x0000000000000000000000000000000000000000`) instead of the actual funded test wallet.
- **Impact**: Erroneous on-chain verification state and reports.
- **Root Cause**: Local `.env` placeholder overrides defaulted the address to zero.
- **Resolution**: Confirmed that SAVE's scan pipeline uses the connected user's MetaMask/OKX wallet address dynamically, and verified native OKB reads on public funded wallets.
- **Files Affected**: `src/lib/save-context.tsx`, `src/lib/xlayer.ts`
- **Status**: **RESOLVED**

### DRIFT-007: Multiple Folders Confusion
- **Date**: 2026-08-17
- **Discovery**: Coexistence of `SAVE-Frontend`, `SAVE-Original`, and `SAVE-XLayer` created code sync issues and copy mistakes.
- **Impact**: Wrong frontend files were copied, overwriting critical work.
- **Root Cause**: Lack of single workspace boundary rules.
- **Resolution**: Declared `C:\Users\PC\Desktop\SAVE-XLayer` as the canonical development workspace. Moving files from other folders is strictly banned.
- **Files Affected**: Governance guidelines.
- **Status**: **RESOLVED**

### DRIFT-008: Solver Scoring Target Demo Bias
- **Date**: 2026-08-17
- **Discovery**: Solver scoring was biased by presentation labels / target demo score. Plan B was hardcoded to force a score of 82.
- **Impact**: Could make recommendations appear hardcoded and undermine the product's deterministic and explainable claim.
- **Root Cause**: Attempting to force identical UI score dial results for the canonical golden path without fully generalizing properties-based math.
- **Resolution**: Removed name/label-based offsets and target score tuning. Scoring is now derived strictly from objective portfolio and route properties (gas, slippage, price impact, reliability, transaction count, unnecessary liquidation, and risk profiles). Placed label invariance and route quality tests.
- **Files Affected**: `src/lib/rescue-solver.ts`, `tests/rescue-solver.test.ts`
- **Status**: **RESOLVED**

### DRIFT-009: Inconsistent Net Output in Canonical Rescue Plan
- **Date**: 2026-08-17
- **Discovery**: The canonical rescue plan incorrectly marked targetMet as true despite having insufficient net expected output (shortfall covered by nominal ETH value alone, leaving a mathematical shortfall).
- **Impact**: Undermines solver correctness and could lead to underfunded rescue execution.
- **Root Cause**: Protected-asset last-resort sizing used inconsistent nominal/output accounting. It solved based on raw USD asset value instead of route net output ratios (price, slippage, and price impact deducted).
- **Resolution**: Replaced nominal calculations with strict net expected swap outputs. The protected-asset solver now computes the exact input balance required to satisfy the remaining shortfall plus route-specific gas/slippage parameters. Placed accounting identity and LAST_RESORT minimality tests.
- **Files Affected**: `src/lib/rescue-solver.ts`, `tests/rescue-solver.test.ts`
- **Status**: **RESOLVED**

### DRIFT-010: Native Gas Asset Depletion Vulnerability
- **Date**: 2026-08-17
- **Discovery**: The Rescue Solver could liquidate the wallet's entire native gas asset (OKB) balance to satisfy target requirements, leaving zero gas to execute the transaction sequence.
- **Impact**: A mathematically valid rescue plan could become completely unexecutable on X Layer.
- **Root Cause**: The solver lacked execution-sequence gas awareness and native token reserve constraints.
- **Resolution**: Implemented a two-pass solver logic: Pass 1 estimates the transaction sequence and calculates the total native gas required; Pass 2 caps the sellable OKB balance by subtracting this gas reserve. Added the `INSUFFICIENT_GAS_RESERVE` execution feasibility gate and corresponding test cases.
- **Files Affected**: `src/lib/rescue-solver.ts`, `tests/rescue-solver.test.ts`
- **Status**: **RESOLVED**

### DRIFT-011: Multi-Network ChainIndex / Testnet Hybrid Mismatch
- **Date**: 2026-08-17
- **Discovery**: OKX OnchainOS Trade API uses mainnet chainIndex 196, while X Layer Testnet (Chain ID 1952) is used separately for development RPC wallet reads.
- **Impact**: Mixing testnet wallets with mainnet DEX quotes could falsely imply a single coherent live transaction during execution verification.
- **Resolution**: Implemented strict environment boundaries and data provenance tagging. The codebase explicitly tracks the chain index and data sources (e.g. `LIVE_RPC` for testnet balance scans, `LIVE_OKX` for mainnet aggregator queries, and `DEMO` for offline fallback parameters), preventing misleading client-side serialization leaks.
- **Files Affected**: `src/server/okx.ts`, `tests/okx-integration.test.ts`, `SAVE_SPONSOR_INTEGRATION.md`
- **Status**: **RESOLVED**

### DRIFT-012: OKX Live Quote Request Timeout
- **Date**: 2026-08-17
- **Discovery**: OKX integration tests passed successfully via mock responses, but the actual live read-only quote query timed out on this network environment.
- **Impact**: Code paths are validated, but live quote retrieval cannot yet be demonstrated from this specific host machine.
- **Resolution**: Maintained strict status separation. If live endpoints time out, they fall back gracefully to controlled demo fixtures without crashing, explicitly reporting the TIMEOUT status. Retries can be launched from network environments capable of routing to OKX Web3 endpoints. Additionally, documented that the WETH contract address on X Layer Mainnet is `0x5A77f1443D16ee5761d310e38b62f77f726bC71c` while the testnet WETH address is `0xBec7859BC3d0603BeC454F7194173E36BF2Aa5C8` (maintained as separated provenance flags).
- **Files Affected**: `tests/okx-integration.test.ts`, `src/server/okx.ts`
- **Status**: **RESOLVED**

### DRIFT-013: Unverified universal DEX spender was hardcoded in simulation architecture
- **Date**: 2026-08-17
- **Discovery**: A universal mock spender address (`0x1111...`) was hardcoded globally for ERC-20 token approvals, rather than resolving spender addresses dynamically from verified chain/route-specific quotes.
- **Impact**: Could cause token approvals to be sent to an incorrect contract address, or falsely claim OKX execution readiness when the spender cannot be verified.
- **Resolution**: Removed all universal spender assumptions. All swap actions now dynamically extract their spenders from route-specific quotes. If the spender is unknown, the validation engine fails with `UNKNOWN_SPENDER`. If a Mainnet spender (Chain Index 196) is provided for a Testnet transaction (Chain ID 1952), the boundary gate rejects the simulation under `WRONG_NETWORK`.
- **Files Affected**: `src/lib/simulation.ts`, `src/lib/rescue-solver.ts`, `tests/simulation.test.ts`
- **Status**: **RESOLVED**

### DRIFT-014: Live Route Provenance Insufficient for VERIFIED_OKX Status
- **Date**: 2026-08-17
- **Discovery**: A "live" route quote was incorrectly treated as sufficient evidence to classify a spender as VERIFIED_OKX, without verifying the spender from authenticated, chain-specific OKX execution/approval data.
- **Impact**: Could falsely elevate an unverified spender address into an approval-ready state, bypassing security verification gates.
- **Resolution**: Spender address verification now requires authentic OKX approval or execution response data (via `GET /api/v6/dex/aggregator/approve-transaction`). Otherwise, the status defaults to `UNKNOWN` and the execution bridge blocks transition to `READY_TO_SIGN`.
- **Files Affected**: `src/lib/simulation.ts`, `src/server/okx.ts`, `tests/simulation.test.ts`
- **Status**: **RESOLVED**

---

## 📝 Drift Entry Template
Use this template to log future issues, limitations, or workarounds:

```markdown
### DRIFT-[ID]
- **Date**: [YYYY-MM-DD]
- **Discovery**: [What was found]
- **Impact**: [How it affects the codebase or user experience]
- **Root Cause**: [Why it happened]
- **Resolution**: [How it was fixed or mitigated]
- **Files Affected**: [List of filenames]
- **Status**: [OPEN | RESOLVED]
```
