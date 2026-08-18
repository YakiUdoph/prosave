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

### DRIFT-015: Canonical Rescue Spans Mock Testnet Assets and Mainnet OKX Router
- **Date**: 2026-08-17
- **Discovery**: The canonical $700 rescue scenario operates on mock Testnet assets (TKX, OKB, ETH) with Mainnet OKX quote mappings, which cannot yet be executed on one single coherent live chain.
- **Impact**: Falsely presenting this as a single live transaction would mislead audits and judges during hackathon reviews.
- **Resolution**: Implemented separate execution modes. The codebase explicitly segregates "DEMO_SIMULATION" (which deterministically solves the $700 rescue without on-chain broadcast), "TESTNET_LIVE" (which executes verified test operations on Chain ID 1952), and "MAINNET_LIVE" (which enforces Chain ID 196). Provenance-aware tags ensure each state and receipt remains distinct.
- **Files Affected**: `src/lib/execution.ts`, `src/lib/save-context.tsx`, `src/routes/protected.tsx`
- **Status**: **RESOLVED**

### DRIFT-016: Contract Addresses Misclassified as Funded Test Wallets
- **Date**: 2026-08-18
- **Discovery / Cause**: A historical address scan treated any address with a positive native Testnet OKB balance as a user-controlled EOA.
- **Impact**: Two X Layer Mainnet token/service contract addresses (0x4ae46a509f6b1d9056937ba4500cb143933d2dc8 and 0x779ded0c9e1022225f8e0630b35a9b54be713736) were incorrectly described as funded Testnet wallets.
- **Resolution**: Never classify an address as a controllable wallet based only on native balance. Before calling an address a user wallet:
  - obtain it from the connected EIP-1193 provider, OR
  - have explicit proof that the user controls the corresponding account.
  Contract/token addresses discovered from API responses must never be used as user wallets.
- **Files Affected**: `src/lib/save-context.tsx`, `src/lib/execution.ts`
- **Status**: **RESOLVED**

### DRIFT-017: TESTNET_LIVE Authorization Button Did Not Reach Wallet Provider
- **Date**: 2026-08-18
- **Discovery / Cause**: Wrapping a `<MagneticButton>` (which itself renders a `<button>`) inside another `<button>` caused HTML button-in-button nesting, which browsers handled inconsistently, leading to swallowed click events and blocking the `executeNextStep` call.
- **Impact**: The "Authorize Rescue Plan" button did not trigger any action, failing to prompt the MetaMask/OKX Wallet or progress the signing flow.
- **Resolution**: Removed the outer `<button>` nesting and attached all handlers and attributes directly to the `MagneticButton` component. Added dynamic account and network chain checks (0x7a0/1952) immediately before calling `eth_sendTransaction` to ensure safety and visibility of any errors.
- **Files Affected**: `src/routes/simulate.tsx`, `src/lib/execution.ts`, `tests/execution.test.ts`
- **Status**: **RESOLVED**

### DRIFT-018: Wallet Session Auto-Connected Without Explicit User Action
- **Date**: 2026-08-18
- **Discovery / Cause**: Previously authorized browser wallet accounts were detected on application mount and were incorrectly treated as an active SAVE session.
- **Impact**: SAVE appeared connected without deliberate user interaction, weakening connection clarity and making wallet/session behavior confusing.
- **Resolution**: Provider availability is now detected passively, while SAVE remains disconnected until the user explicitly clicks Connect Wallet. Intent example text was also moved from real state into a non-parsed placeholder.
- **Files Affected**: `src/lib/save-context.tsx`, `src/routes/connect.tsx`, `src/components/save/intent-box.tsx`, `src/lib/save-data.ts`
- **Status**: **RESOLVED**

### DRIFT-019: Live Transaction Confirmation Could Remain Pending Indefinitely
- **Date**: 2026-08-18
- **Discovery**: Real transactions on X Layer Testnet became stuck in the pending confirmation stage indefinitely, never transitioning to success or timeout.
- **Impact**: The UI would show "Confirming..." forever, leaving the user with no visual path to recover or view the real transaction hash.
- **Root Cause**: Polling for the transaction receipt was performed using the browser-injected wallet provider's `eth_getTransactionReceipt` method. Many injected browser wallet providers (MetaMask, OKX Wallet) rate-limit, reject, or freeze indefinitely on browser-direct transaction query requests. If the promise hung, the polling loop never progressed.
- **Resolution**: Refactored the receipt polling loop to use the client-safe public RPC client (`publicClient`) configured with fallback endpoints instead of the wallet-injected provider. Additionally, added a strict transaction hash format gate, a hard 90-second timeout that transitions the session to `CONFIRMATION_TIMEOUT` without automatically rebroadcasting, and duplicate-click protection that resumes polling if a transaction hash already exists.
- **Files Affected**: `src/lib/save-context.tsx`, `src/routes/simulate.tsx`, `src/lib/execution.ts`, `src/lib/simulation.ts`, `tests/execution.test.ts`
- **Status**: **RESOLVED**

---

### DRIFT-020: Wallet connectivity was passively assumed rather than genuinely distinct
- **Date**: 2026-08-18
- **Discovery**: Wallet cards previously implied connectivity that was not genuinely distinct.
- **Impact**: Falsely claimed connectivity states or connected automatically without user intent.
- **Root Cause**: Hardcoded connected session triggers on provider presence check, and missing setup project ID checks for WalletConnect.
- **Resolution**: Removed auto-connection on mount. Implemented explicit connection trigger. WalletConnect checks `VITE_WALLETCONNECT_PROJECT_ID` configuration, showing warnings when missing. EIP-6963 discovery list and OKX specific provider checks are fully active.
- **Files Affected**: `src/routes/connect.tsx`, `src/lib/save-context.tsx`
- **Status**: **RESOLVED**

### DRIFT-021: Portfolio scanner architecture limited to static fixture tokens
- **Date**: 2026-08-18
- **Discovery**: The portfolio scanner architecture was limited to canonical fixture assets, blocking multi-chain or dust asset representations.
- **Impact**: Multi-chain, blue-chip, stable, volatile, and dust positions could not be scanned or normalized.
- **Root Cause**: Hardcoded 4-token list inside static client references.
- **Resolution**: Redesigned mock assets array to 15 assets across 5 chains (Arbitrum, Base, Polygon, X Layer, Ethereum), covering blue-chip ETH, stable USDC, volatile TKX, and 5 distinct dust holdings (<$1) with full EVM chain ID and network tags, proving exact normalization.
- **Files Affected**: `src/lib/xlayer.ts`, `tests/portfolio-normalization.test.ts`
- **Status**: **RESOLVED**

### DRIFT-022: Rescue plans lacked meaningful differentiation
- **Date**: 2026-08-18
- **Discovery**: Rescue plan candidates A, B, and C generated identical actions and trades for similar input profiles.
- **Impact**: Undermined the capital preservation thesis and scoring credibility.
- **Root Cause**: High-level heuristics and scoring offsets did not sufficiently enforce asset and sequence diversity constraints.
- **Resolution**: Generalised the solver math to enforce plan-name invariance. Implemented `arePlansDiverse` check evaluating sold assets, gas costs, secured amounts, protected asset preservation ratios, time horizons, and transaction counts. Plan candidate B is optimized, Plan A prioritizes speed, and Plan C restricts swaps strictly to high-risk assets, resolving duplication.
- **Files Affected**: `src/lib/rescue-solver.ts`, `tests/rescue-solver.test.ts`
- **Status**: **RESOLVED**

### DRIFT-023: Server/client import protection bypassed during OKX balance integration
- **Date**: 2026-08-18
- **Discovery**: Server-only modules containing crypto modules and process environment variables were dynamically imported to bypass static analyzers.
- **Impact**: Security vulnerability of credentials leak and static analysis failure risk.
- **Root Cause**: Bypassing TanStack Start's client-server directory limits.
- **Resolution**: Created `src/lib/okx.server.ts` with all OKX request methods and server functions, removing all node imports and environment credential access from the client files. Client imports `serverGetAllTokenBalances` securely using the `.server.ts` compiler boundary.
- **Files Affected**: `src/lib/xlayer.ts`, `src/lib/okx.server.ts`, `tests/okx-integration.test.ts`, `src/server/okx.ts` (deleted)
- **Status**: **RESOLVED**

### DRIFT-024: Manually redrawn SVG brandmark described as exact vectorization
- **Date**: 2026-08-18
- **Discovery**: The redrawn SVG was not an exact vectorization of the brand logo `public/save-logo-source.png`.
- **Impact**: Misrepresented source brand fidelity.
- **Root Cause**: Manually approximating detailed PNG visual components via vector equations.
- **Resolution**: Renamed/documented the redrawn vector file as `save-mark-simplified.svg` and kept `save-mark-transparent.png` as the high-fidelity detailed brandmark derived from `save-logo-source.png`.
- **Files Affected**: `public/brand/save-mark-simplified.svg`, `public/brand/save-mark-transparent.png`
- **Status**: **RESOLVED**

### DRIFT-025: Production deployment guidance incorrectly targeted Cloudflare Pages
- **Date**: 2026-08-18
- **Discovery**: Production deployment documentation incorrectly targeted Cloudflare Pages rather than the current Cloudflare Workers TanStack Start deployment path.
- **Impact**: Could lead to invalid build output target assumption (.output/public only) and static deployments that break server functions.
- **Root Cause**: Overlooking the auto-generated Nitro configuration which outputs a Cloudflare Workers compatibility structure in `.output/server/wrangler.json`.
- **Resolution**: Corrected deployment guidance to specify Cloudflare Workers (using `wrangler deploy`) with native static assets bindings.
- **Files Affected**: `DRIFT_LOG.md`, final deployment guidance reports
- **Status**: **RESOLVED**

### DRIFT-026: Removed Ankr RPC fallback was accidentally reintroduced into deployment configuration
- **Date**: 2026-08-18
- **Discovery**: The stale Ankr RPC fallback (`https://rpc.ankr.com/xlayer_testnet`) was reintroduced in `validate-gates.mjs`.
- **Impact**: Reintroduced connection attempts to an endpoint returning HTTP 403.
- **Root Cause**: Overlooked duplicate fallback initialization during security/reality verification tasks.
- **Resolution**: Removed the Ankr reference and aligned backup configurations to use verified official terigon RPC endpoints.
- **Files Affected**: `validate-gates.mjs`
- **Status**: **RESOLVED**

### DRIFT-027: Mock assets blended into connected wallet scans inflating holdings
- **Date**: 2026-08-18
- **Discovery**: Scan page displayed rich mock assets (ETH, USDC, PEPE) for connected wallets even if they only had a sparse native OKB balance.
- **Impact**: Misrepresented actual on-chain connected wallet holdings, leading to trust/data honesty issues during audits.
- **Root Cause**: `scanPortfolio` initialized the scan array with `richMockAssets` and simply inserted/replaced the native OKB row, leaking mock holdings into live scans.
- **Resolution**: Introduced two explicit, user-toggleable states (`LIVE_WALLET` and `DEMO_PORTFOLIO`). Live wallets scan from an empty array `[]` capturing strictly OKX API and RPC balances, and sparse wallets are provided with a dedicated CTA to switch to Demo Portfolio. Simulation/execution locks prevent live transactions on simulated demo targets.
- **Files Affected**: `src/lib/xlayer.ts`, `src/lib/save-context.tsx`, `src/lib/rescue-solver.ts`, `src/components/save/nav.tsx`, `src/components/save/portfolio-asset-card.tsx`, `src/routes/scan.tsx`, `src/routes/command.tsx`, `src/routes/intent.tsx`, `src/routes/plan.tsx`, `src/routes/simulate.tsx`, `src/routes/protected.tsx`
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
