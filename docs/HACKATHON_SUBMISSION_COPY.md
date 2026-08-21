# SAVE — Hackathon Submission Copy

This document contains the official, verified submission copy for the OKX / X Layer hackathon. All statements correspond to the actual live build at [prosave.vercel.app](https://prosave.vercel.app).

> **Runtime boundary:** Rescue planning uses deterministic constraint extraction and simulated route parameters. Authenticated OKX routing adapters target X Layer Mainnet (chain 196) and are not used to execute on X Layer Testnet (1952). The optional 0.0001 OKB testnet self-transfer proves wallet authorization and settlement only; it never advances or completes a rescue plan.

---

## SECTION A — PROJECT IDENTITY

* **Project Name**: SAVE
* **Tagline**:
  * *Option 1 (Preferred)*: Tell SAVE the outcome. It finds the best-fit portfolio path.
  * *Option 2*: Intent-driven rescue engine for Web3 portfolios.
  * *Option 3*: DEX aggregators swap tokens. SAVE optimizes portfolio outcomes.
* **One-Liner** (22 words): 
  SAVE is an intent-driven portfolio rescue agent that optimizes multi-asset liquidations and risk reduction under strict user-defined asset preservation rules.
* **Short Description** (61 words):
  SAVE is an intent-driven Web3 intelligence layer for emergency portfolio restructuring. It deterministically extracts target amounts and protected holdings, then compares three scored liquidation plans using explicitly simulated route parameters.
* **Medium Description** (140 words):
  SAVE is an intent-driven portfolio rescue agent built for Web3 portfolios. Unlike standard DEX aggregators that focus on individual token-pair routes, SAVE reasons at the portfolio level. Users can connect their wallet, paste a public EVM address for read-only analysis, or explore using a multi-chain Demo Portfolio. 

  By translating natural language (e.g., *"Get me $700 USDC. Don't sell my ETH"*), SAVE extracts structured financial constraints, balances risk, and compiles three distinct recovery plan candidates. Each plan is scored based on slippage, asset volatility, and capital preservation ratios. 

  Before any execution, SAVE runs plans through local simulation safety gates. Finally, to demonstrate block-level execution feasibility on X Layer, the user manually signs a native OKB verification transaction, with block receipts polled and confirmed in real time.
* **Full Description** (347 words):
  SAVE is an intent-driven portfolio rescue intelligence layer that bridges the gap between high-level user financial goals and complex, multi-transaction execution in Web3. During sudden market crashes, margin calls, or severe volatility incidents, users know their target outcome (e.g., securing stablecoins, preserving native gas, exiting high-risk exposures) but face substantial manual friction determining the optimal liquidation sequence. Standard routing interfaces only solve trade parameters for a single swap; they cannot evaluate portfolio-level trade-offs or respect asset-preservation constraints.

  SAVE turns natural language intent into structured, executable recovery plans. The journey begins with data scan versatility: users can connect MetaMask or OKX Wallet, paste any public EVM address for sandboxed watch-only scanning, or activate the high-fidelity Demo Portfolio containing diverse mock positions.

  Once scanned, users enter their goals in plain English. SAVE's intent processor extracts the target amount, destination asset, and protected tokens. The solver then computes three distinct, scored strategy candidates:
  1. **Plan A (Speed Priority)**: A fast route maximizing immediate dollar recovery, even if it requires liquidating protected assets as a last resort.
  2. **Plan B (Balanced Outcome - Recommended)**: Sells volatile and high-risk tokens first, maintaining a 100% preservation ratio on protected assets.
  3. **Plan C (High-Risk Disposal)**: Avoids touching protected holdings entirely, prioritizing meme coin liquidation and accepting potential target shortfalls.

  Plans pass local safety and feasibility checks covering estimate freshness, gas sufficiency, protection policy, and anticipated approval requirements. These checks are not EVM transaction simulation.

  Rescue plans remain simulated and require no signature. Separately, X Layer Wallet Verification is non-custodial and optional: a connected wallet may authorize a 0.0001 OKB self-transfer, after which SAVE polls the X Layer Testnet receipt for the actual hash, block, and gas used.

  *DEX aggregators optimize swaps. SAVE optimizes portfolio outcomes.*

---

## SECTION B — THE PROBLEM

### 1-Sentence Version:
During sudden market volatility or when users urgently need liquidity, crypto users struggle to manually calculate the sequence of token sales, slippage limits, and spender contract approvals required to restructure their portfolios.

### 75-Word Version:
When market conditions collapse, users know their target outcome—such as raising stablecoins while keeping their ETH—but are forced to make complex, manual decisions about which tokens to swap, in what sequence, and through which pools. Traditional DEX aggregators operate only at the single transaction level. They cannot reason about portfolio-level constraints, risk-concentration parameters, or gas reserve preservation, leading to costly liquidation errors and slow emergency responses.

### 150-Word Version:
During sudden market crashes or severe volatility, Web3 users face high cognitive overhead. They know the financial outcome they need—for example, raising $700 USDC to cover a margin call or dumping meme coins—but executing this manually requires calculating liquidity depth across multiple tokens, verifying approved spenders, setting slippage boundaries, and reserving native gas. 

A single mistake can result in excessive slippage, failed transactions, or compromised approvals. The core issue is that existing DeFi tools optimize individual swap routes without evaluating portfolio-level trade-offs or respecting user-defined constraints. Users do not need another swap router; they need a portfolio decision agent that translates high-level intent into optimized multi-step liquidation strategies while keeping native gas reserves intact and preventing the accidental sale of long-term strategic holdings.

---

## SECTION C — THE SOLUTION

SAVE solves this by guiding users through a structured, highly visual portfolio rescue funnel:

```
[Connect Wallet / Watch-Only Paste / Demo Mode]
                    │
                    ▼
          [Portfolio Discovery]
  Natively scans native and ERC-20 assets
                    │
                    ▼
             [Intent Parsing]
Deterministically extracts financial outcomes and constraints
                    │
                    ▼
          [Rescue Plan Solver]
  Generates 3 distinct, dynamically scored plans
                    │
                    ▼
         [Local Plan Validation]
  Checks estimate age, gas assumptions, policy, and approval requirements
                    │
                    ▼
      [Optional Wallet Verification]
  0.0001 OKB self-transfer receipt on X Layer Testnet
```

* **No-Friction Analysis**: Users can analyze public wallet addresses in watch-only mode without sharing private keys or connecting wallet extensions. Wallet connection is requested only when a user initiates a transaction signature request, separating scan analytics from authorization actions.

---

## SECTION D — WHAT MAKES SAVE DIFFERENT

1. **Portfolio-Level Optimization**: Most tools optimize individual transaction parameters. SAVE reasons about the entire portfolio, determining which assets should be traded, which should be kept, and in what sequence swaps must execute to hit target goals.
2. **Intent-Driven Constraints**: Translates raw human queries into structured logic. Rules like *"Don't sell my ETH unless necessary"* are parsed into objective functions that enforce last-resort or strict asset preservation ratios.
3. **Multi-Strategy Diversity**: The solver generates three materially different strategies (Speed, Balanced, Defensive) and scores them based on slippage, risk reduction, and preservation metrics, rather than presenting a single hardcoded path.
4. **Watch-Only & Connected Separation**: Offers pure read-only public scans alongside wallet connections. It enforces strict ownership matching—blocking signatures if the connected wallet differs from the analyzed watched address.
5. **Local Plan Validation**: Runs simulated plans through estimate-age, feasibility, gas-assumption, protection-policy, and anticipated-approval checks without prompting the wallet.

---

## SECTION E — AI COMPONENT

* **AI Summary** (74 words):
  SAVE acts as an intent-driven portfolio decision agent. It interprets natural-language intent through a deterministic classification parser, mapping user queries to target assets, goals, and protected tokens. The agent evaluates the scanned portfolio state to customize suggestions, perform target feasibility checks, and score rescue candidates. The current build uses deterministic structured intent and scoring logic for reliability, establishing the architecture to incorporate richer LLM planning models in the future.
* **AI Technical Explanation** (148 words):
  In the current hackathon build, SAVE operates as an intent-driven portfolio decision agent. It utilizes a deterministic intent parser (`src/lib/intent-parser.ts`) to extract financial constraints from plain text inputs, identifying target tokens, target amounts, protected assets, and urgency policies. This approach eliminates LLM hallucination risks in high-stakes financial operations.

  The agent's decision logic is portfolio-aware: it dynamically adjusts the UI by generating asset-specific suggestions, evaluating target feasibility, and warning of gas shortages based on live RPC queries. 

  The solver compiles and ranks three strategy profiles using heuristic parameters including asset risk classifications, liquidity depth, and protection ratios. This architecture decouples intent extraction from strategy generation, providing a production-ready framework. In future iterations, the deterministic parsing module can be replaced with an LLM reasoning loop while maintaining the same validated execution guardrails.

---

## SECTION F — OKX INTEGRATION

* **1-Sentence Version**:
  SAVE integrates OKX Web3 balance APIs and active read-only X Layer Mainnet quotes. Exact quotes, OKX-derived estimates, and demo estimates are distinct, and rescue execution remains simulated.
* **100-Word Sponsor Version**:
  SAVE uses the OKX balance API where available and secure HMAC-signed server functions for X Layer Mainnet read-only quotes. The solver requests exact action amounts when possible, labels scaled values as OKX-derived estimates, and falls back explicitly to demo estimates. Rescue swaps remain simulated; X Layer Testnet is used only for optional wallet verification.
* **Technical Bullet List**:
  * **Balance Retrieval**: Queries OKX balance API to discover native and token positions.
  * **Route/Quote Adapter**: Retains authenticated X Layer Mainnet quote functions as reference infrastructure.
  * **Transaction Payload Adapter**: Retains mainnet swap and approval payload functions that are not used by the testnet rescue runtime.
  * **HMAC Authentication**: Isolates API credentials inside secure server functions, signing outgoing headers on the backend.
  * **EIP-6963 Wallet Connectivity**: Passive discovery of the OKX Wallet extension.

---

## SECTION G — X LAYER INTEGRATION

* **1-Sentence Version**:
  SAVE uses X Layer Testnet for optional X Layer Wallet Verification, including native OKB balance checks, network validation, and public receipt polling.
* **100-Word Sponsor Version**:
  **X Layer Testnet** serves as SAVE’s optional wallet-authorization and settlement-verification environment. Before verification, SAVE checks Chain ID 1952 and confirms that native **OKB** exceeds the required threshold.

  The user may authorize a 0.0001 OKB self-transfer. SAVE polls the public RPC client for the transaction hash, block number, gas used, and successful settlement without changing the simulated rescue.
* **Technical Bullet List**:
  * **Network Enforcement**: Detects active Chain ID and requests network switches to Chain ID `1952` (X Layer Testnet).
  * **Verification Balance Gate**: Checks native OKB via RPC and disables optional verification if the balance is insufficient (`<= 0.001 OKB`).
  * **RPC Client Confirmation**: Uses Viem to query public RPC nodes and poll confirmations.
  * **X Layer Wallet Verification**: Signs and broadcasts the disclosed 0.0001 OKB self-transfer through EIP-1193.
  * **Receipt Analysis**: Retrieves final gas used, status, and block number.

---

## SECTION H — WHAT IS LIVE TODAY

To maintain absolute transparency, the following table details the status of every capability in the current repository:

| Capability | Status | Description |
| --- | --- | --- |
| **Public-address portfolio scan** | **LIVE** | Paste any EVM address to scan positions via RPC/OKX in watch-only mode. |
| **Connected-wallet portfolio scan** | **LIVE** | Connect via OKX Wallet/MetaMask/WalletConnect to read live positions. |
| **Demo portfolio** | **DEMO** | Synthetic positions (ETH, PEPE, TKX) used to demo multi-asset solver strategies. |
| **Natural-language intent console** | **LIVE** | Parses goals, protected assets, and policies from raw text inputs. |
| **Rescue solver** | **LIVE** | Calculates and ranks Plan A, B, and C based on asset risk and slippage. |
| **Rescue plan validation** | **SIMULATED** | Runs local safety, feasibility, policy, estimate-age, and gas checks. |
| **OKX route infrastructure** | **MAINNET REFERENCE** | Authenticated chain-196 quote/approval/swap adapters exist but are not used as testnet execution data. |
| **Full multi-asset rescue swap** | **NOT BROADCAST** | Multi-token liquidate swaps are simulated; actual swaps are not broadcast. |
| **X Layer Wallet Verification** | **OPTIONAL LIVE TESTNET TRANSACTION** | Broadcasts a user-authorized 0.0001 OKB self-transfer, separate from rescue state. |
| **Verification receipt confirmation** | **OPTIONAL LIVE TESTNET RECEIPT** | Polls X Layer RPC to confirm wallet-verification settlement. |

---

## SECTION I — USER JOURNEY

1. **Portfolio Discovery**: Connect your wallet (MetaMask/OKX Wallet) or paste any public EVM address to scan holdings.
2. **Analysis Pipeline**: Watch SAVE's pipeline scan balances, classify token risks, and check for sparse assets.
3. **State Intent**: Input your recovery goal (e.g. *"Get me $700 USDC. Keep all my ETH"*).
4. **Compare Plans**: Inspect three strategy candidates ranked by slippage, risk, and asset protection metrics.
5. **Simulate Safety**: Run safety checks confirming quote age, native gas sufficiency, and contract spenders.
6. **X Layer Wallet Verification (Optional)**: Authorize a 0.0001 OKB self-transfer and inspect its independent receipt.

---

## SECTION J — MARKET / USER VALUE

* **Target User** (80 words):
  SAVE is built for active DeFi participants, retail traders holding volatile multi-asset portfolios, and DAO/treasury risk operators managing assets across EVM layers. These users need to act immediately during black swan liquidations or when they urgently need liquidity. 

  Rather than manually navigating multiple swap interfaces, checking slippage thresholds, and managing gas configurations, SAVE offers a unified dashboard. It is also designed for risk analysts who want to run mock recovery scenarios using public wallet addresses in watch-only mode.
* **Why Now** (92 words):
  Web3 is moving from raw transactions to intent-driven architectures. As assets fragment across Layer 2 chains, manual portfolio management during volatility has become slow, complex, and prone to errors. 

  Additionally, users demand non-custodial, keyless analysis tools before connecting their wallets. By integrating OKX OnchainOS and X Layer, SAVE aligns with this shift: it provides a secure intelligence layer that allows users to analyze risk, verify safety, and simulate recovery outcomes before granting wallet permissions, maximizing safety during high-stress recovery and liquidation situations.

---

## SECTION K — BUSINESS / GROWTH POTENTIAL

SAVE has a sustainable, non-hype business model built around three revenue and partnership pillars:

1. **Transaction Routing Fees**: When live mainnet liquidations are executed, SAVE can capture a small percentage fee (e.g., 0.1%) on swaps routed through the OKX DEX aggregator, aligning monetization with user success.
2. **Premium Treasury Services**: DAOs and active treasury managers can subscribe to advanced portfolio monitoring services, setting automated liquidation triggers and safety alerts based on asset risk concentrations.
3. **Wallet SDK / API Integrations**: Wallet providers and web dashboards can license SAVE's intent-parsing and strategy-scoring engine as an SDK, offering native portfolio-level liquidations directly inside their consumer interfaces.

---

## SECTION L — FUTURE ROADMAP

### NOW — Hackathon MVP
* EIP-6963 OKX Wallet discovery and Reown connectivity.
* Watch-only address scanning and sparse portfolio warnings.
* Deterministic natural-language intent console with target feasibility warnings.
* Simulated strategy generation and X Layer Testnet verification proofs.

### NEXT — Mainnet & Execution
* Mainnet deployment on X Layer (Chain ID 196) and Ethereum.
* Live multi-leg transaction execution broadcasting swap payloads directly.
* Multi-source RPC node fallbacks to ensure recovery tool uptime during RPC outages.
* Local state receipt logging to prevent double-swaps if the session is closed mid-rescue.

### LATER — Portfolio OS
* Real-time portfolio risk alerts and automated recovery triggers.
* Rich LLM planning agent integration for complex multi-leg strategy reasoning.
* Support for cross-chain liquidations using OKX Bridge routes.
* Institutional DAO multisig treasury policies (e.g., Safe integration).

---

## SECTION M — WHY SAVE SCORES WELL (JUDGING CRITERIA)

* **AI Application**: SAVE implements a reliable intent-driven decision agent. It extracts structured constraints from raw queries and adapts suggestions based on portfolio balances, preventing AI hallucination risks.
* **Innovation**: Most DeFi platforms operate at the transaction level. SAVE is a pioneer in intent-driven, portfolio-level restructuring, prioritizing asset protection over individual swap optimization.
* **Product Completeness**: SAVE features a production-ready frontend built on TanStack Start, a secure backend function boundary for OKX APIs, and a 34-test regression suite.
* **User Value**: Minimizes transaction friction during high-stress market liquidations, giving users a clear pathway to restructure their assets.
* **X Layer Integration**: Prompts network switching, gates signatures based on native OKB gas reserves, and verifies block confirmations on the X Layer Testnet in real time.
* **Growth Potential**: Offers a clear path toward mainnet execution, transaction fee monetization, and wallet SDK licensing.
* **Ecosystem Contribution**: Encourages X Layer adoption by proving transaction broadcast and block polling pipelines work.

---

## SECTION N — LINKS

* **Live App**: [https://prosave.vercel.app](https://prosave.vercel.app)
* **GitHub Repository**: [https://github.com/YakiUdoph/prosave.git](https://github.com/YakiUdoph/prosave.git)
* **Architecture Diagram**: [docs/save-architecture.svg](file:///c:/Users/PC/Desktop/SAVE-XLayer/docs/save-architecture.svg)
* **Sponsor Integration Proof**: [docs/SPONSOR_INTEGRATION_PROOF.md](file:///c:/Users/PC/Desktop/SAVE-XLayer/docs/SPONSOR_INTEGRATION_PROOF.md)
* **Demo Video**: [TO ADD]
* **X / Twitter**: [TO ADD]

---

## SECTION O — GOOGLE FORM COPY

* **Project Name**: SAVE
* **Tagline**: Tell SAVE the outcome. It finds the best-fit portfolio path.
* **Project Description**:
  SAVE is an intent-driven portfolio rescue agent built for moments when crypto users urgently need to reduce risk or raise liquidity. Users state an outcome in plain language, and SAVE translates it into structured constraints and scored simulated strategies using exact OKX quotes where available, clearly labelled OKX-derived estimates, and explicit demo fallbacks.
* **Problem**:
  During market crashes or severe volatility, users know their target outcome (e.g., raising stablecoins or reducing risk) but struggle to manually calculate the swap sequence, slippage parameters, and approved spender contracts, leading to costly liquidation errors.
* **Solution**:
  SAVE provides an intent-driven portfolio optimizer. It allows keyless watch-only scans, parses natural language into structured constraints, scores strategy candidates based on capital preservation ratios, and demonstrates execution safety checks.
* **AI Usage**:
  Uses a structured intent-parser to extract target assets, goals, and protected tokens from plain text. The decision agent evaluates active holdings to generate suggestions and check target feasibility.
* **OKX Integration**:
  Queries OKX Web3 APIs for balances and read-only X Layer Mainnet quotes through server-side HMAC-SHA256 signing. The planning path does not request approvals or swap payloads.
* **X Layer Integration**:
  Enforces network switches to X Layer Testnet (Chain ID 1952), verifies native OKB gas reserves via RPC client, and broadcasts signature verification receipts.
* **Innovation**:
  Focuses on portfolio-level outcome optimization rather than single transaction swaps, introducing asset protection rules into DEX routing.
* **Target Users**:
  Active DeFi traders, retail portfolio holders, and DAO risk managers.
* **Future Vision**:
  To become the default portfolio-level recovery OS, integrating live multi-leg execution, L2 bridges, and automated risk monitoring triggers.
* **Live Demo URL**: [https://prosave.vercel.app](https://prosave.vercel.app)
* **GitHub URL**: [https://github.com/YakiUdoph/prosave.git](https://github.com/YakiUdoph/prosave.git)
* **Demo Video URL**: [TO ADD]
* **X Account**: [TO ADD]
* **Submission Post URL**: [TO ADD]

---

## SECTION P — DEVPOST / DORAHACKS LONG DESCRIPTION

### Problem
During sudden market volatility or severe asset declines, crypto users know the high-level financial outcome they need—such as raising stablecoins, reducing risk exposure, or preserving strategic holdings. However, executing this manually requires them to inspect balances across multiple chains, calculate pool liquidity to avoid slippage, manage native gas, and verify approved spender contracts. Standard trade aggregators only solve routing for individual swaps; they cannot reason about overall portfolio risk or respect asset-preservation constraints.

### What SAVE Does
SAVE is an intent-driven portfolio rescue agent for Web3 portfolios. It acts as a portfolio-policy layer above DEX infrastructure. Instead of trading token by token, the user defines a target outcome in plain language. SAVE deterministically compares simulated rescue strategies, while optional X Layer Wallet Verification remains separate from rescue execution.

### How It Works
1. **Discovery**: Paste any public EVM address for a watch-only scan, connect via browser wallet, or load the multi-chain Demo Portfolio.
2. **Intent Parsing**: State your outcome (e.g., *"Get me $700 USDC. Don't sell my ETH unless necessary"*). The parser extracts structured goals and protected tokens.
3. **Strategy Solver**: Computes and ranks three strategy profiles (Speed, Balanced, Defensive) based on asset risk metrics and slippage.
4. **Plan Validation**: Checks estimate age, gas assumptions, target feasibility, protected-asset policy, and anticipated approval requirements locally.
5. **X Layer Wallet Verification**: The user may authorize a separate 0.0001 OKB self-transfer. SAVE polls the X Layer Testnet receipt without changing the simulated rescue.

### AI Component
Uses a deterministic parser to map raw text to target symbols, amounts, and protected assets, avoiding LLM hallucinations. The agent dynamically adjusts suggestions and feasibility indicators based on scanned token balances.

### OKX OnchainOS
Uses OKX Web3 balance APIs where available and HMAC-signed X Layer Mainnet read-only quotes for supported identities. Exact, derived, and demo provenance remain separate.

### X Layer Consensus
Runs network checks enforcing Chain ID `1952` (X Layer Testnet), gates signatures based on native OKB gas reserves, and polls block receipts via RPC.

### What is Live Today
Wallet discovery, available balance scanning, deterministic intent parsing, and plan scoring run in the application. Rescue parameters remain simulated. The optional X Layer Wallet Verification transaction is the only testnet broadcast and does not execute the rescue.

### Why It Matters
SAVE moves DeFi interfaces from trade-by-trade entry forms to portfolio-level intent systems. It allows users to safely analyze public addresses without key exposure, minimizing execution mistakes during emergency liquidations.

---

## SECTION Q — 150-WORD FINAL PITCH

SAVE is an intent-driven portfolio rescue agent built for moments when crypto users urgently need to reduce risk or raise liquidity. Users can connect a wallet or paste a public address in watch-only mode. They state an outcome such as: "Raise $700 USDC, sell risky assets first, and preserve my ETH." SAVE converts that goal into structured constraints, analyzes the portfolio, generates multiple rescue strategies, scores their trade-offs, and evaluates feasibility. Supported X Layer Mainnet actions use read-only OKX quotes; derived and demo estimates are disclosed separately. Rescue swaps remain simulated, while an optional user-signed native OKB transaction verifies wallet authorization and settlement on X Layer Testnet.

DEX aggregators optimize swaps. SAVE optimizes portfolio outcomes.

---

## SECTION R — 50-WORD FINAL PITCH

SAVE is an intent-driven portfolio rescue agent. Users state a goal in plain language; SAVE deterministically parses constraints, calculates scored strategies using simulated route parameters, runs local plan-validation checks, and optionally demonstrates wallet authorization and settlement through a separate X Layer Testnet verification transaction.

---

## SECTION S — 280-CHARACTER PITCH (X / TWITTER)

DEX aggregators optimize swaps. SAVE optimizes portfolio outcomes.

State your goal, compare scored rescue strategies powered by OKX route intelligence, simulate safety checks, and verify the user-authorized transaction pipeline on X Layer Testnet.

prosave.vercel.app

---

## SECTION T — SUBMISSION CLAIM AUDIT

We have audited all descriptions, proofs, and scripts to ensure technical accuracy and honesty:
1. **Autonomous Trading**: Clarified that SAVE is non-custodial and never performs background auto-broadcasts; every transaction requires manual user wallet signatures.
2. **Rescue Broadcast Boundary**: Multi-asset rescue swaps are simulated locally, while X Layer Wallet Verification is a separate 0.0001 OKB self-transfer.
3. **Holdings Provenance**: Clarified that mock assets are isolated to the Demo Portfolio, while live wallet and watch-only scans retrieve strictly live RPC/OKX holdings.
4. **Network Deployment**: Clarified that the live transaction settles on X Layer Testnet (Chain ID 1952), keeping future mainnet deployment claims distinct.
5. **Security Framing**: Removed any claims of compromised or hacked wallet emergency recovery, framing SAVE as a portfolio restructuring tool during asset volatility or urgent liquidity needs.
