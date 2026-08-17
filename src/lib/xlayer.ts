/**
 * SAVE X Layer Interface
 * Secure client-side RPC infrastructure (no private keys or dedicated endpoint tokens allowed).
 * Live balance source of truth is the EIP-1193 connected browser wallet address.
 */
import { createPublicClient, fallback, http, formatEther, formatUnits } from "viem";
import { defineChain } from "viem/utils";

// Define X Layer Testnet Chain (Chain ID: 1952)
export const xLayerTestnet = defineChain({
  id: 1952,
  name: "X Layer Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "OKB",
    symbol: "OKB",
  },
  rpcUrls: {
    default: { http: ["https://testrpc.xlayer.tech/terigon"] },
  },
  blockExplorers: {
    default: { name: "OKLink", url: "https://www.oklink.com/xlayer-test" },
  },
  testnet: true,
});

// ERC-20 Minimal ABI
const minErc20Abi = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Token contract addresses on X Layer Testnet (from technical baseline metadata)
export const TOKENS = {
  OKB: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  WETH: "0x5a77f1443d16ee5761d310e38b62f77f726bc71c",
  USDC: "0xb6ceceab302e2e4948951ee7843fc24e92933061",
};

// Client-safe public RPC endpoints (Never exposes private QuickNode RPC URLs or API tokens)
export const publicClient = createPublicClient({
  chain: xLayerTestnet,
  transport: fallback([
    http("https://testrpc.xlayer.tech/terigon"),
    http("https://xlayertestrpc.okx.com/terigon"),
  ], { rank: false }),
});

export type DataSource = "live" | "demo" | "estimated" | "unverified";

export type ScannedAsset = {
  symbol: string;
  name: string;
  chain: string;
  balance: string;
  value: number;
  change24h: number;
  liquidity: number;
  risk: "protected" | "medium" | "high";
  note: string;
  isNative: boolean;
  isProtected: boolean;
  contractAddress?: string;
  dataSource: DataSource;
  priceSource: DataSource;
};

/**
 * Fetches real balances on X Layer Testnet for native OKB.
 * WETH and USDC contract bytecodes failed validation (returned 0x / empty),
 * so their balance reads are treated as unverified/demo assets.
 */
export async function scanPortfolio(address: string | null): Promise<{
  assets: ScannedAsset[];
  rpcStatus: "online" | "offline";
  totalValue: number;
}> {
  // Static Reference pricing (flagged internally as fixture / estimated)
  const PRICES = {
    OKB: 47.17,     // fixture price
    WETH: 2871.73,  // fixture price
    USDC: 1.00,     // fixture price
    TKX: 0.028,     // fixture price
  };

  const defaultDemoAssets: ScannedAsset[] = [
    {
      symbol: "ETH",
      name: "Ethereum",
      chain: "X Layer",
      balance: "0.842",
      value: 2418,
      change24h: -1.2,
      liquidity: 98,
      risk: "protected",
      note: "Demo holding — long-term protection target",
      isNative: false,
      isProtected: true,
      contractAddress: TOKENS.WETH,
      dataSource: "demo",
      priceSource: "estimated",
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
      note: "Demo holding — moderate drawdown exposure",
      isNative: true,
      isProtected: false,
      contractAddress: TOKENS.OKB,
      dataSource: "demo",
      priceSource: "estimated",
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
      note: "Demo holding — stable reserve",
      isNative: false,
      isProtected: true,
      contractAddress: TOKENS.USDC,
      dataSource: "demo",
      priceSource: "estimated",
    },
    {
      symbol: "TKX",
      name: "Token X",
      chain: "X Layer",
      balance: "18400",
      value: 516,
      change24h: -18.4,
      liquidity: 34,
      risk: "high",
      note: "Demo volatile asset — thin liquidity, high slippage risk",
      isNative: false,
      isProtected: false,
      dataSource: "demo",
      priceSource: "demo",
    },
  ];

  if (!address) {
    const total = defaultDemoAssets.reduce((sum, a) => sum + a.value, 0);
    return {
      assets: defaultDemoAssets,
      rpcStatus: "offline",
      totalValue: total,
    };
  }

  try {
    // 1. Fetch Real Native OKB Balance using client-side publicClient
    const okbWei = await publicClient.getBalance({ address: address as `0x${string}` });
    const okbBalance = parseFloat(formatEther(okbWei));

    // WETH and USDC contract address on X Layer Testnet returned empty bytecodes (0x) during validation.
    // They are therefore classified as UNVERIFIED/DEMO in the scan model.
    const wethBalance = 0.0;
    const usdcBalance = 0.0;

    const assets: ScannedAsset[] = [
      {
        symbol: "ETH",
        name: "Ethereum",
        chain: "X Layer",
        balance: "0.842", // Keep demo holdings so solver has simulated assets to work with
        value: Math.round(0.842 * PRICES.WETH),
        change24h: -1.2,
        liquidity: 98,
        risk: "protected",
        note: "Demo holding — (WETH contract 0x5a77... returned 0x, unverified)",
        isNative: false,
        isProtected: true,
        contractAddress: TOKENS.WETH,
        dataSource: "unverified",
        priceSource: "estimated",
      },
      {
        symbol: "OKB",
        name: "OKB",
        chain: "X Layer",
        balance: okbBalance.toFixed(4),
        value: Math.round(okbBalance * PRICES.OKB),
        change24h: -4.6,
        liquidity: 88,
        risk: "medium",
        note: `Live native balance of connected wallet on X Layer Testnet`,
        isNative: true,
        isProtected: false,
        contractAddress: TOKENS.OKB,
        dataSource: "live",
        priceSource: "estimated",
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
        note: "Demo holding — (USDC contract 0xb6ce... returned 0x, unverified)",
        isNative: false,
        isProtected: true,
        contractAddress: TOKENS.USDC,
        dataSource: "unverified",
        priceSource: "estimated",
      },
      {
        symbol: "TKX",
        name: "Token X",
        chain: "X Layer",
        balance: "18400",
        value: Math.round(18400 * PRICES.TKX),
        change24h: -18.4,
        liquidity: 34,
        risk: "high",
        note: "Demo volatile asset — thin liquidity, high slippage risk",
        isNative: false,
        isProtected: false,
        dataSource: "demo",
        priceSource: "demo",
      },
    ];

    const totalValue = assets.reduce((sum, a) => sum + a.value, 0);

    return {
      assets,
      rpcStatus: "online",
      totalValue,
    };
  } catch (error) {
    console.error("X Layer RPC scan failed, live data unavailable:", error);
    const total = defaultDemoAssets.reduce((sum, a) => sum + a.value, 0);
    return {
      assets: defaultDemoAssets,
      rpcStatus: "offline",
      totalValue: total,
    };
  }
}
