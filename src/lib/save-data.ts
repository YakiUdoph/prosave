export type RiskTier = "protected" | "medium" | "high";

export type Asset = {
  symbol: string;
  name: string;
  chain: string;
  balance: string;
  value: number;
  change24h: number;
  liquidity: number;
  risk: RiskTier;
  note: string;
};

export const PORTFOLIO: Asset[] = [
  {
    symbol: "ETH",
    name: "Ethereum",
    chain: "X Layer",
    balance: "0.842",
    value: 2418,
    change24h: -1.2,
    liquidity: 98,
    risk: "protected",
    note: "Long-term holding — flagged as protected",
  },
  {
    symbol: "OKB",
    name: "OKB",
    chain: "X Layer",
    balance: "31.5",
    value: 1486,
    change24h: -4.6,
    liquidity: 88,
    risk: "medium",
    note: "Deep liquidity, moderate drawdown exposure",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    chain: "X Layer",
    balance: "412.00",
    value: 412,
    change24h: 0.0,
    liquidity: 100,
    risk: "protected",
    note: "Stable reserve",
  },
  {
    symbol: "TKX",
    name: "Token X",
    chain: "X Layer",
    balance: "18,400",
    value: 516,
    change24h: -18.4,
    liquidity: 34,
    risk: "high",
    note: "Thin liquidity, high slippage risk",
  },
];

export const PORTFOLIO_VALUE = 4832;
export const POTENTIAL_EXPOSURE = -713;

export const SCAN_STEPS = [
  "Scanning ETH…",
  "Checking OKB…",
  "Evaluating liquidity…",
  "Finding exit routes…",
  "Calculating SAVE Score…",
];

export const PROTECTION_METRICS = [
  { label: "Liquidity", value: 95 },
  { label: "Slippage", value: 91 },
  { label: "Execution Safety", value: 88 },
  { label: "Market Impact", value: 90 },
  { label: "Gas Efficiency", value: 96 },
];

export type Plan = {
  id: "A" | "B" | "C";
  name: string;
  summary: string;
  score: number;
  output: number;
  damage: string;
  recommended?: boolean;
  actions: { verb: "SELL" | "KEEP"; amount: string; asset: string }[];
};

export const PLANS: Plan[] = [
  {
    id: "A",
    name: "Plan A — Maximum output",
    summary: "Highest output, higher portfolio damage",
    score: 76,
    output: 742.1,
    damage: "High",
    actions: [
      { verb: "SELL", amount: "22%", asset: "ETH" },
      { verb: "SELL", amount: "100%", asset: "Token X" },
      { verb: "KEEP", amount: "100%", asset: "OKB" },
    ],
  },
  {
    id: "B",
    name: "Plan B — Recommended",
    summary: "Balanced output with ETH fully preserved",
    score: 94,
    output: 704.32,
    damage: "Minimal",
    recommended: true,
    actions: [
      { verb: "SELL", amount: "70%", asset: "OKB" },
      { verb: "SELL", amount: "100%", asset: "risky token exposure" },
      { verb: "KEEP", amount: "100%", asset: "ETH" },
    ],
  },
  {
    id: "C",
    name: "Plan C — Conservative",
    summary: "Lowest market impact, slower fill",
    score: 89,
    output: 681.4,
    damage: "Very low",
    actions: [
      { verb: "SELL", amount: "45%", asset: "OKB" },
      { verb: "SELL", amount: "60%", asset: "Token X" },
      { verb: "KEEP", amount: "100%", asset: "ETH" },
    ],
  },
];

export const INTENT_SUGGESTIONS = [
  "Get me $700 USDC.",
  "Protect my ETH.",
  "Reduce my risk.",
  "Exit risky assets.",
];

export const PARSED_INTENT = [
  { label: "Goal", value: "$700 USDC" },
  { label: "Protected asset", value: "ETH" },
  { label: "Risk preference", value: "Conservative" },
  { label: "Priority", value: "Minimum damage" },
];

export const SIMULATION = {
  output: 704.32,
  gas: 0.08,
  slippage: 0.24,
  risk: "LOW",
  route: "OKX DEX Aggregator",
};

export const TIMELINE = [
  "Portfolio analyzed",
  "Route optimized",
  "Transaction simulated",
  "Safety checks passed",
];

export const RECEIPT = [
  { label: "Received", value: "704.32 USDC" },
  { label: "Sold", value: "22.05 OKB · 18,400 TKX" },
  { label: "Preserved", value: "0.842 ETH" },
  { label: "Network", value: "X Layer" },
  { label: "Route", value: "OKX DEX Aggregator" },
  { label: "Gas", value: "$0.08" },
  { label: "Tx", value: "0x7f3a…c41e" },
];

export const HISTORY = [
  { date: "17 Aug", action: "Rescue executed · $704 USDC secured", score: 94 },
  { date: "02 Aug", action: "Risk reduced 38% · meme exposure exited", score: 91 },
  { date: "24 Jul", action: "Protection review · no action needed", score: 88 },
];
