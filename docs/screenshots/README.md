# SAVE — Hackathon Screenshot Package Manifest & Capture Guide

This directory contains the manifest and detailed execution guide for capturing the final judge-facing screenshot assets for the SAVE presentation. 

---

## Screenshot Manifest

| Filename | Route | Mode | Classification | What it Proves / Visual Value |
| :--- | :--- | :--- | :--- | :--- |
| `01-save-hero.png` | `/` | Connected/Disconnected | Marketing | **Product Thesis Cover**: Shows premium dark-mode visual structure, SAVE branding, primary CTA, and OKX OnchainOS/X Layer positionings. |
| `02-live-wallet-scan.png` | `/scan` | `LIVE_WALLET` | Live Read | **Data Honesty/Provenances**: Proves that SAVE reads live testnet wallet assets honestly, displaying only native OKB gas and zero fake balances. |
| `03-demo-portfolio-scan.png` | `/scan` | `DEMO_PORTFOLIO` | Demo Read | **Solver Scale/Capacity**: Showcases the reasoning capability of the engine over complex mock portfolios (15 assets, 5 chains, risk telemetry). |
| `04-intent-engine.png` | `/intent` | `DEMO_PORTFOLIO` | Parsing Logic | **AI Natural-Language Intent**: Captures plain language constraint parsing and structured extraction of objectives/policies. |
| `05-rescue-plan-comparison.png` | `/plan` | `DEMO_PORTFOLIO` | Solver Output | **Outcome Optimization vs Swaps**: Displays three candidate plans (A, B, C) with distinct preservation scores, time horizons, and routes. |
| `06-simulation-safety.png` | `/simulate` | `DEMO_SIMULATION` | Simulation | **Simulation & Guardrails**: Shows localized prechecks (network check, gas reserve limit, quote age, OKX contract spender verification). |
| `07-xlayer-live-verification.png` | `/protected` | `TESTNET_LIVE` | Testnet Live | **Execution Proof**: Displays the real X Layer block receipt (gas used, block, transaction hash) linked to the simulated rescue. |

---

## Manual Capture Instructions

To ensure consistent aspect ratios, high resolution, and clean layouts, use the following manual capture instructions to take screenshots of the production app at [prosave.vercel.app](https://prosave.vercel.app).

### General Setup Checklist
* **Browser**: Google Chrome or Brave (clean profile preferred).
* **Viewport Size**: Resize window to `1440×900` or `1600×900` pixels (or use chrome devtools device simulator).
* **Browser Zoom**: Set zoom level strictly to `100%`.
* **State**: No devtools inspector visible, no browser bookmarks bar visible, no system toast notifications active.
* **Wallet**: Keep your EVM wallet (MetaMask or OKX Wallet) connected and switched to **X Layer Testnet (Chain ID 1952 / 0x7A0)**.
* **Gas Reserve**: Ensure your testnet wallet has `> 0.001 OKB` for the execution test.

---

### Screenshot 1: Hero / Product Thesis Cover (`01-save-hero.png`)
* **URL**: `https://prosave.vercel.app/`
* **Portfolio Mode**: Connected (displays `0x...` in top right) or Disconnected.
* **Input / Clicks**: None (passive capture).
* **Exact Desired UI State**: Page scrolled to top. Full hero banner visible.
* **What MUST be visible**: 
  * Logo wordmark `SAVE` in top left.
  * Hero title: `"Markets move in seconds. Your exit shouldn't."`
  * Subtitle: *"AI-powered emergency exit engine for Web3 portfolios."*
  * CTA Button: `"Connect Wallet"` or `"Enter Command Center"`.
  * Visual graphic representing the liquidity solver or risk dial.
* **What MUST NOT be visible**: 
  * Wallet dropdowns.
  * Browser scrollbars.

---

### Screenshot 2: Live Wallet Honesty (`02-live-wallet-scan.png`)
* **URL**: `https://prosave.vercel.app/scan`
* **Portfolio Mode**: `LIVE_WALLET` (Active)
* **Input / Clicks**: Connect testnet wallet, let it scan.
* **Exact Desired UI State**: Shows scanned assets for the connected wallet address.
* **What MUST be visible**:
  * Status Pill reading: `LIVE WALLET DATA`.
  * The connected wallet address (e.g. `0x8F5...95F57`).
  * Only actual owned assets on-chain (usually just `OKB` on X Layer Testnet with a small balance).
  * Net value (e.g. `<$0.10`).
* **What MUST NOT be visible**:
  * Demo mock holdings (like ETH, PEPE, WOKB) under live mode.

---

### Screenshot 3: Demo Portfolio (`03-demo-portfolio-scan.png`)
* **URL**: `https://prosave.vercel.app/command`
* **Portfolio Mode**: `DEMO_PORTFOLIO` (Active)
* **Input / Clicks**: Click **[Switch to Demo Mode]** in the navbar, then navigate to `/command`.
* **Exact Desired UI State**: Scanned sample portfolio dashboard.
* **What MUST be visible**:
  * Status Pill reading: `DEMO PORTFOLIO — SAMPLE DATA`.
  * Portfolio value (e.g. `$3,047.00`).
  * Telemetry report (15 assets scanned, 5 chains detected, 14.5% stablecoin coverage, risk dial indicating "Needs Attention").
  * Sorted portfolio list starting with high-risk assets (TKX, PEPE).
* **What MUST NOT be visible**:
  * Connected live wallet address indicator.

---

### Screenshot 4: Intent Engine (`04-intent-engine.png`)
* **URL**: `https://prosave.vercel.app/intent`
* **Portfolio Mode**: `DEMO_PORTFOLIO` (Active)
* **Input / Clicks**: Type `"Get me $700 USDC. Don't sell my ETH unless necessary."` into the AI Intent Box, and click **[Generate Rescue Plan]**.
* **Exact Desired UI State**: Wait 1 second for the parsed constraints layout to fade in before capturing.
* **What MUST be visible**:
  * Status Pill reading: `DEMO PORTFOLIO — SAMPLE DATA`.
  * Extracted Constraints panel listing:
    * **Target**: `700 USDC`
    * **Protected**: `ETH`
    * **Objective**: `Minimum portfolio damage`
    * **Policy**: `Sell ETH only as last resort`
  * Text: *"Constraints locked. Building candidate routes across OKX DEX Aggregator..."*
* **What MUST NOT be visible**:
  * Empty parser states or cursor in text box.

---

### Screenshot 5: Rescue Strategy Comparison (`05-rescue-plan-comparison.png`)
* **URL**: `https://prosave.vercel.app/plan`
* **Portfolio Mode**: `DEMO_PORTFOLIO` (Active)
* **Input / Clicks**: Select **Plan B** (Optimized Plan) tab/card on the candidate plan column. Expand the **Compare Rescue Strategies** table.
* **Exact Desired UI State**: Full comparison grid showing columns for Plan A, Plan B, and Plan C.
* **What MUST be visible**:
  * Candidate Plan B highlighted as recommended.
  * Score Dial reading `90` for Plan B.
  * Matrix comparison showing:
    * Plan B preserves `100%` of protected assets.
    * Plan A preserves `0%` (violates ETH protection).
    * Plan C preserves `100%` but falls short of target liquidity.
  * CTA Button: `"Simulate plan B"`.
* **What MUST NOT be visible**:
  * Broken layouts or overlapping text elements.

---

### Screenshot 6: Simulation + Safety (`06-simulation-safety.png`)
* **URL**: `https://prosave.vercel.app/simulate`
* **Portfolio Mode**: `DEMO_SIMULATION` (Active)
* **Input / Clicks**: Wait for the simulation checks timeline to resolve.
* **Exact Desired UI State**: Stable simulation view showing telemetry and safety checkpoints.
* **What MUST be visible**:
  * Status banner: `SIMULATED RESCUE`.
  * Completed checkpoints with green checkmarks:
    * `Wallet connection verified`
    * `Connected chain ID 1952 validated`
    * `Rescue plan feasibility checked`
    * `Protected asset constraints evaluated`
    * `ERC-20 allowances determined`
  * Spender address statuses showing `VERIFIED_OKX` or `VERIFIED_RPC`.
  * CTA Button: `"Authorize Rescue Plan"`.
* **What MUST NOT be visible**:
  * Live metamask confirmation prompt overlaps.

---

### Screenshot 7: X Layer Live Verification (`07-xlayer-live-verification.png`)
* **URL**: `https://prosave.vercel.app/protected`
* **Portfolio Mode**: `TESTNET_LIVE` (Execution session completed)
* **Input / Clicks**: Trigger the live testnet verification transaction on `/simulate` by clicking **[Authorize Rescue Plan]**, approve the transaction signature in your browser wallet, and wait for confirmation.
* **Exact Desired UI State**: Final receipt and verification page.
* **What MUST be visible**:
  * Top stats labeled: `RESCUE OUTCOME: SIMULATED` and `X LAYER VERIFICATION: TESTNET_LIVE`.
  * Transaction hash (starts with `0x...`), Block number, gas limit, and gas used parameters.
  * Verification status indicator: `Confirmed` or `Success`.
* **What MUST NOT be visible**:
  * Warning toasts or pending transaction spinners.
