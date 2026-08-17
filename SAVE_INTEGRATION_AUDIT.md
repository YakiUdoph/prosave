# SAVE — Functional Integration Audit

This audit document details the state of the recovered approved original SAVE frontend repository before implementing functional integration.

## 1. Technical Architecture & Environment

- **Framework**: TanStack Start (React 19 + Vite 8 + TanStack Router 1 + Nitro 3).
- **Routing**: File-based routing located in `src/routes/` with path routing defined in `src/router.tsx` and generated tree in `src/routeTree.gen.ts`.
- **State Management**: Simple React Context in `src/lib/save-context.tsx` (`SaveProvider` and `useSave` hook).
- **Styling**: Tailwind CSS v4 coupled with custom glassmorphism styles in `src/styles.css`.
- **Environment Variables**: Managed server-side/build-time. The `.env` file specifies X Layer Testnet RPC URL, primary and backup endpoints, OKX Web3 API credentials (`OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_API_PASSPHRASE`, `OKX_PROJECT_ID`), and local test account keys.

---

## 2. Component & Page Audit

The frontend consists of 8 pages. Below is the audit of each screen's functional implementation.

| Page / Route | Path | UI Status | Functional Integration Status |
| :--- | :--- | :--- | :--- |
| **OVERVIEW** | `/` | Approved | **STATIC**. Renders animated numbers and mock statistics. Links to `/connect` and `/scan`. |
| **CONNECT** | `/connect` | Approved | **MOCKED**. Clicking "OKX Wallet" or other cards runs a 2.4s fake loading handshake timeout before setting `connected = true` and navigating to `/scan`. |
| **SCAN** | `/scan` | Approved | **MOCKED**. Simulates 5 steps of scanning over a 4.5s period using `setTimeout` before enabling navigation to `/command`. Displays static assets. |
| **COMMAND** | `/command` | Approved | **STATIC / MOCKED**. Displays mock portfolio value ($4,832), mock exposure (-$713), mock risk meter (74/84), and hardcoded protection score (82). |
| **INTENT** | `/intent` | Approved | **MOCKED**. Displays a static text prompt input, simulates intent parsing on submit, and navigates to `/plan` after a 1.4s delay. Displays hardcoded constraints. |
| **PLAN** | `/plan` | Approved | **MOCKED**. Displays three static candidate plans (A, B, C) with hardcoded token actions (sell percentages) and a hardcoded score of 94. |
| **SIMULATE** | `/simulate` | Approved | **MOCKED**. Displays mock simulation outcomes ($704.32 output, $0.08 gas, 0.24% slippage, LOW risk) and a mock route timeline. |
| **RESULT** | `/protected` | Approved | **MOCKED**. Displays static success summaries, hardcoded receipt items, and static history logs. |

---

## 3. Real, Mocked, Static, Missing & Ready for Integration

### REAL (Validated in CLI backend)
- **RPC Connectivity**: Ability to query native `OKB` and ERC-20 `WETH` balances on X Layer Testnet (Chain ID 1952) via JSON-RPC.
- **OKX OnchainOS Client**: Authenticated request signing using HMAC-SHA256 signature to query token details and quotes.
- **Resiliency & Fallback**: Timeout-aborted calls and backup RPC provider transition scripts.
- **Risk Rules**: Mathematical assessment of portfolio asset volatility and protected preservation rules.

### MOCKED (In Frontend)
- **Wallet Handshake**: Transition from unconnected to connected state.
- **Scanning Pipeline**: Delayed simulation of portfolio scanning.
- **Intent Parsing**: Splitting prompt phrases into target, amount, and constraints.
- **Plan Generation**: High-fidelity Plan A, B, C static calculations.
- **State Simulation**: Mock output, gas, and slippage.
- **Execution Hash & Receipt**: Static fields for transaction details.

### STATIC (In Frontend)
- **Portfolio Value & Metrics**: Portfolio total value ($4832) and individual asset positions (ETH, OKB, USDC, TKX) are hardcoded arrays.
- **Protection Metrics**: Static dial score and progress bars.
- **Execution Timeline**: hardcoded steps.

### MISSING (To Be Integrated)
- **Active Provider Connection**: EIP-1193 browser injection (`window.ethereum`) detection, wallet account address, chain ID query, network switches, and event listening.
- **Proxy API Layer**: Server-side handler to receive client quote requests, fetch signed OKX OnchainOS API quotes, and return them securely without exposing secrets.
- **Dynamic Solver Engine**: Browser/Client-side solver that parses actual token balances, computes liquidation paths, protects specified assets, and scores routes.
- **Dynamic State Engine**: Linking of React context state variables to feed values directly to components like `PortfolioAssetCard`, `RescuePlanCard`, `TransactionReceipt`, etc.
- **Failures & Errors**: Proper UI toasts or warning states when RPC fails, the wallet rejects a network change, or the solver fails to achieve the target.

### READY FOR INTEGRATION
- **Existing component library**: Reusable visual structures (`Panel`, `ProgressBar`, `ScoreDial`) are ready to ingest dynamic props instead of hardcoded constants.
- **X Layer Testnet Configs**: Ready to plug into standard Web3 provider interfaces.

---

## 4. Security Notes
- OKX Web3 API requests require HMAC-SHA256 headers constructed using `OKX_SECRET_KEY` and `OKX_API_PASSPHRASE`.
- **CRITICAL**: These secrets must remain server-side. They will be integrated via TanStack Start Server Functions (`createServerFn`), which compile to secure server-side endpoints.
- Wallet private key (`PRIVATE_KEY`) in `.env` is reserved for CLI testing. The frontend must only trigger transaction signing through the connected browser/injected wallet (e.g. OKX Wallet) to ensure the user retains authorization.
