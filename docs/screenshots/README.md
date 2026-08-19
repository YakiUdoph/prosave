# SAVE — Hackathon Screenshot Package Manifest & Capture Guide

This directory contains the manifest and detailed execution guide for capturing the final judge-facing screenshot assets for the SAVE presentation. 

---

## Screenshot Manifest

| Filename | Route | Mode | Classification | What it Proves / Visual Value |
| :--- | :--- | :--- | :--- | :--- |
| `01-save-hero.png` | `/` | Connected/Disconnected | Marketing | **Product Thesis Cover**: Shows premium dark-mode visual structure, SAVE branding, primary CTA, and OKX OnchainOS/X Layer positionings. |
| `02-connect-options.png` | `/connect` | Disconnected | Interactive | **手势 Handshake versatility**: Proves Option 1 (wallet cards) and Option 2 (EVM Address paste-to-scan input) coexist cleanly without requiring credentials. |
| `03-watch-only-scan.png` | `/scan` | `WATCH_ONLY` | Watch Mode | **Non-Custodial Analysis**: Displays `"WATCH-ONLY PORTFOLIO"` header, shortened scanned address, public scanning stats, and the sparse portfolio warning. |
| `04-demo-portfolio-scan.png` | `/scan` | `DEMO_PORTFOLIO` | Demo Read | **Solver Scale/Capacity**: Showcases the reasoning capability of the engine over complex mock portfolios (15 assets, 5 chains, risk telemetry). |
| `05-portfolio-aware-intent.png` | `/intent` | `DEMO_PORTFOLIO` | Parsing Logic | **AI Natural-Language Intent**: Captures plain language constraint parsing, active source stats summary, and dynamic suggestions. |
| `06-rescue-plan-comparison.png` | `/plan` | `DEMO_PORTFOLIO` | Solver Output | **Outcome Optimization vs Swaps**: Displays three candidate plans (A, B, C) with distinct preservation scores, time horizons, and routes. |
| `07-simulation-safety-gates.png` | `/simulate` | `WATCH_ONLY` / `DEMO` | Simulation | **Simulation & Guardrails**: Shows localized prechecks, spender statuses, and the watch-only execution block warning CTA. |
| `08-xlayer-live-verification-receipt.png` | `/protected` | `TESTNET_LIVE` | Testnet Live | **Execution Proof**: Displays the real X Layer block receipt (gas used, block, transaction hash) linked to the simulated rescue. |

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

### Screenshot 2: Connect Handshake Options (`02-connect-options.png`)
* **URL**: `https://prosave.vercel.app/connect`
* **Portfolio Mode**: Disconnected
* **Input / Clicks**: None (passive capture).
* **Exact Desired UI State**: Shows both Option 1 (MetaMask, OKX Wallet connection cards) and Option 2 (EVM Address paste panel).
* **What MUST be visible**:
  * Title: `"Connect your wallet"`.
  * Injected wallet options list including OKX Wallet.
  * Pasteur panel title: `"Prefer not to connect?"`.
  * Public address input box and `"Scan address"` button.

---

### Screenshot 3: Watch-Only Portfolio Scan (`03-watch-only-scan.png`)
* **URL**: `https://prosave.vercel.app/scan`
* **Portfolio Mode**: `WATCH_ONLY` (Active)
* **Input / Clicks**: Paste a public address (e.g. `0xd8da6bf26964af9d7eed9e03e53415d37aa96045`) on `/connect` and click Scan.
* **Exact Desired UI State**: Scan pipeline is complete (100%).
* **What MUST be visible**:
  * Status Pill reading: `"WATCH-ONLY PORTFOLIO"`.
  * Scanned address telemetry.
  * Non-blocking `"Limited Portfolio Detected"` alert card (if address holds sparse assets).

---

### Screenshot 4: Demo Portfolio Command Center (`04-demo-portfolio-scan.png`)
* **URL**: `https://prosave.vercel.app/command`
* **Portfolio Mode**: `DEMO_PORTFOLIO` (Active)
* **Input / Clicks**: Click **[Explore with Demo Portfolio]** on the scan alert or switch via navbar.
* **Exact Desired UI State**: Command center dashboard displaying diverse mock assets.
* **What MUST be visible**:
  * Status Pill reading: `"DEMO PORTFOLIO — SAMPLE DATA"`.
  * Portfolio net value (e.g. `$3,047.00`).
  * Telemetry metrics showing assets (15), chains (5), and risk levels.

---

### Screenshot 5: Portfolio-Aware Intent Parser (`05-portfolio-aware-intent.png`)
* **URL**: `https://prosave.vercel.app/intent`
* **Portfolio Mode**: `DEMO_PORTFOLIO` (Active)
* **Input / Clicks**: Type `"Get me $700 USDC. Don't sell my ETH unless necessary."` into the AI Intent Box, and click **[Generate Rescue Plan]**.
* **Exact Desired UI State**: Extracted constraints and active portfolio stats panels are visible.
* **What MUST be visible**:
  * Heading: `"What outcome do you want from this portfolio?"`.
  * **Active Portfolio Summary Panel** showing current values, actionable assets (15), and risk percentages.
  * **Extracted Constraints** detailing: Target: `700 USDC`, Protected: `ETH`, Objective: `Minimum portfolio damage`, Policy: `Sell ETH only as last resort`.

---

### Screenshot 6: Rescue Strategy Comparison (`06-rescue-plan-comparison.png`)
* **URL**: `https://prosave.vercel.app/plan`
* **Portfolio Mode**: `DEMO_PORTFOLIO` (Active)
* **Input / Clicks**: Select **Plan B** candidate card. Expand the **Compare Rescue Strategies** table.
* **Exact Desired UI State**: Comparison matrix details.
* **What MUST be visible**:
  * Score Dial reading `90` for Plan B (Recommended).
  * Strategy matrix comparing Plan A, B, and C parameters.
  * CTA Button: `"Simulate plan B"`.

---

### Screenshot 7: Simulation + Safety Gates (`07-simulation-safety-gates.png`)
* **URL**: `https://prosave.vercel.app/simulate`
* **Portfolio Mode**: `WATCH_ONLY` (Or `DEMO_SIMULATION`)
* **Input / Clicks**: Navigate to simulation page.
* **Exact Desired UI State**: Timeline prechecks resolved.
* **What MUST be visible**:
  * Simulation timeline checks completed.
  * ERC-20 allowances with spender statuses showing `VERIFIED_OKX` or `VERIFIED_RPC`.
  * Watch-only execution block card reading: `"WALLET AUTHORIZATION REQUIRED"`.

---

### Screenshot 8: X Layer Live Verification Receipt (`08-xlayer-live-verification-receipt.png`)
* **URL**: `https://prosave.vercel.app/protected`
* **Portfolio Mode**: `TESTNET_LIVE` (After signing OKB self-transfer validation proof on X Layer Testnet)
* **Exact Desired UI State**: Settlement page showing receipt details.
* **What MUST be visible**:
  * Top stats labeled: `RESCUE OUTCOME: SIMULATED` and `X LAYER VERIFICATION: TESTNET_LIVE`.
  * Dynamic block parameters (gas used, block number, transaction hash) polled from public X Layer RPC nodes.
