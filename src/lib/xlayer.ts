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

import { serverGetAllTokenBalances } from "./okx.server";
export { serverGetAllTokenBalances };

export type DataSource = "live" | "demo" | "estimated" | "unverified" | "LIVE_OKX_BALANCE" | "LIVE_RPC";

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
  
  // Normalized PortfolioAsset fields
  chainIndex?: number;
  evmChainId?: number;
  network?: string;
  tokenAddress?: string;
  decimals?: number;
  priceUsd?: number;
  valueUsd?: number;
  logoUrl?: string;
  riskFlags?: string[];
  liquidityStatus?: string;
  walletAddress?: string;
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

  const richMockAssets: ScannedAsset[] = [
    // Ethereum Mainnet
    {
      symbol: "ETH",
      name: "Ethereum",
      chain: "Ethereum",
      balance: "0.842",
      value: 2418,
      change24h: -1.2,
      liquidity: 98,
      risk: "protected",
      note: "Ethereum Mainnet long-term asset reserve",
      isNative: true,
      isProtected: true,
      dataSource: "demo",
      priceSource: "estimated",
      evmChainId: 1,
      chainIndex: 1,
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      chain: "Ethereum",
      balance: "120.00",
      value: 120,
      change24h: 0.0,
      liquidity: 100,
      risk: "protected",
      note: "Stablecoin reserve on Ethereum",
      isNative: false,
      isProtected: true,
      dataSource: "demo",
      priceSource: "estimated",
      evmChainId: 1,
      chainIndex: 1,
    },
    {
      symbol: "PEPE",
      name: "Pepe Coin",
      chain: "Ethereum",
      balance: "5000000",
      value: 0.45,
      change24h: -12.4,
      liquidity: 45,
      risk: "high",
      note: "Meme dust token on Ethereum",
      isNative: false,
      isProtected: false,
      dataSource: "demo",
      priceSource: "demo",
      evmChainId: 1,
      chainIndex: 1,
    },
    // X Layer
    {
      symbol: "OKB",
      name: "OKB",
      chain: "X Layer",
      balance: "31.5",
      value: 1486,
      change24h: -4.6,
      liquidity: 88,
      risk: "medium",
      note: "Native gas token on X Layer",
      isNative: true,
      isProtected: false,
      contractAddress: TOKENS.OKB,
      dataSource: "demo",
      priceSource: "estimated",
      evmChainId: 196,
      chainIndex: 196,
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
      note: "Stable reserve on X Layer",
      isNative: false,
      isProtected: true,
      contractAddress: TOKENS.USDC,
      dataSource: "demo",
      priceSource: "estimated",
      evmChainId: 196,
      chainIndex: 196,
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
      note: "Volatile test asset on X Layer testnet",
      isNative: false,
      isProtected: false,
      dataSource: "demo",
      priceSource: "demo",
      evmChainId: 196,
      chainIndex: 196,
    },
    {
      symbol: "WOKB",
      name: "Wrapped OKB",
      chain: "X Layer",
      balance: "1.0",
      value: 47.17,
      change24h: -4.5,
      liquidity: 80,
      risk: "medium",
      note: "Wrapped utility token on X Layer",
      isNative: false,
      isProtected: false,
      dataSource: "demo",
      priceSource: "estimated",
      evmChainId: 196,
      chainIndex: 196,
    },
    {
      symbol: "SHIB",
      name: "Shiba Inu",
      chain: "X Layer",
      balance: "8000",
      value: 0.12,
      change24h: -8.1,
      liquidity: 40,
      risk: "high",
      note: "Meme dust token on X Layer",
      isNative: false,
      isProtected: false,
      dataSource: "demo",
      priceSource: "demo",
      evmChainId: 196,
      chainIndex: 196,
    },
    // Arbitrum
    {
      symbol: "ETH",
      name: "Ethereum",
      chain: "Arbitrum",
      balance: "0.156",
      value: 450,
      change24h: -1.1,
      liquidity: 97,
      risk: "protected",
      note: "Asset reserve on Arbitrum L2",
      isNative: true,
      isProtected: true,
      dataSource: "demo",
      priceSource: "estimated",
      evmChainId: 42161,
      chainIndex: 42161,
    },
    {
      symbol: "ARB",
      name: "Arbitrum",
      chain: "Arbitrum",
      balance: "50.0",
      value: 35,
      change24h: -5.2,
      liquidity: 85,
      risk: "medium",
      note: "Governance asset on Arbitrum L2",
      isNative: false,
      isProtected: false,
      dataSource: "demo",
      priceSource: "estimated",
      evmChainId: 42161,
      chainIndex: 42161,
    },
    {
      symbol: "DOGE",
      name: "Dogecoin",
      chain: "Arbitrum",
      balance: "1.0",
      value: 0.08,
      change24h: -9.5,
      liquidity: 38,
      risk: "high",
      note: "Volatile dust token on Arbitrum",
      isNative: false,
      isProtected: false,
      dataSource: "demo",
      priceSource: "demo",
      evmChainId: 42161,
      chainIndex: 42161,
    },
    // Base
    {
      symbol: "ETH",
      name: "Ethereum",
      chain: "Base",
      balance: "0.087",
      value: 250,
      change24h: -0.9,
      liquidity: 97,
      risk: "protected",
      note: "Asset reserve on Base L2",
      isNative: true,
      isProtected: true,
      dataSource: "demo",
      priceSource: "estimated",
      evmChainId: 8453,
      chainIndex: 8453,
    },
    {
      symbol: "DEGEN",
      name: "Degen Token",
      chain: "Base",
      balance: "25.0",
      value: 0.18,
      change24h: -15.4,
      liquidity: 30,
      risk: "high",
      note: "Speculative volatile dust asset on Base",
      isNative: false,
      isProtected: false,
      dataSource: "demo",
      priceSource: "demo",
      evmChainId: 8453,
      chainIndex: 8453,
    },
    // Polygon
    {
      symbol: "POL",
      name: "POL Token",
      chain: "Polygon",
      balance: "37.5",
      value: 15,
      change24h: -3.8,
      liquidity: 82,
      risk: "medium",
      note: "Native gas token on Polygon PoS",
      isNative: true,
      isProtected: false,
      dataSource: "demo",
      priceSource: "estimated",
      evmChainId: 137,
      chainIndex: 137,
    },
    {
      symbol: "QUICK",
      name: "QuickSwap",
      chain: "Polygon",
      balance: "10.0",
      value: 0.05,
      change24h: -11.0,
      liquidity: 35,
      risk: "high",
      note: "DEX dust asset on Polygon",
      isNative: false,
      isProtected: false,
      dataSource: "demo",
      priceSource: "demo",
      evmChainId: 137,
      chainIndex: 137,
    },
  ];

  if (!address) {
    const total = richMockAssets.reduce((sum, a) => sum + a.value, 0);
    return {
      assets: richMockAssets,
      rpcStatus: "offline",
      totalValue: total,
    };
  }

  let finalAssets = [...richMockAssets];
  let isLive = false;

  // 1. Attempt to fetch live balances from OKX OnchainOS balance API via server function
  try {
    const okxRes = await serverGetAllTokenBalances({ address });
    if (okxRes.success && Array.isArray(okxRes.data)) {
      const liveAssets: ScannedAsset[] = okxRes.data.map((item: any) => {
        const symbol = item.tokenSymbol || item.symbol || "UNKNOWN";
        const tokenAddress = item.tokenAddress || item.tokenContractAddress || "";
        const decimals = Number(item.decimals || item.tokenPrecision || 18);
        const balance = item.balance || "0";
        const priceUsd = Number(item.priceUsd || item.tokenUnitPrice || 0);
        const valueUsd = Number(item.usdValue || (Number(balance) * priceUsd) || 0);
        const isNative = item.isNative || tokenAddress === "" || tokenAddress === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
        
        // Dynamic risk mapping
        let risk: "protected" | "medium" | "high" = "medium";
        if (symbol === "USDC" || symbol === "USDT" || symbol === "ETH") {
          risk = "protected";
        } else if (symbol === "TKX" || symbol === "PEPE" || symbol === "SHIB" || symbol === "DEGEN") {
          risk = "high";
        }

        const networkNames: Record<number, string> = {
          1: "Ethereum",
          196: "X Layer",
          42161: "Arbitrum",
          8453: "Base",
          137: "Polygon",
        };

        const chainIndex = Number(item.chainIndex || 196);

        return {
          symbol,
          name: item.tokenName || item.name || symbol,
          chain: networkNames[chainIndex] || `Chain ${chainIndex}`,
          balance,
          value: Math.round(valueUsd),
          change24h: Number(item.change24h || -2.5),
          liquidity: Number(item.liquidity || 85),
          risk,
          note: `Live token balance from OKX balance API across L2 networks`,
          isNative,
          isProtected: risk === "protected",
          contractAddress: tokenAddress,
          dataSource: "LIVE_OKX_BALANCE",
          priceSource: "estimated",
          chainIndex,
          evmChainId: chainIndex,
          logoUrl: item.logoUrl || item.iconUrl || "",
        };
      });

      if (liveAssets.length > 0) {
        finalAssets = liveAssets;
        isLive = true;
      }
    }
  } catch (okxErr) {
    console.warn("OKX Balance API fetch failed, falling back to mock assets:", okxErr);
  }

  // 2. Query Live Native OKB balance on X Layer Testnet 1952 via viem RPC Client (TESTNET_LIVE execution proof requirement)
  try {
    const okbWei = await publicClient.getBalance({ address: address as `0x${string}` });
    const okbBalance = parseFloat(formatEther(okbWei));

    // Update or insert the live OKB balance on X Layer in the assets list
    const okbAssetIndex = finalAssets.findIndex(
      (a) => a.symbol === "OKB" && (a.chain === "X Layer" || a.chainIndex === 196)
    );

    const liveOkbAsset: ScannedAsset = {
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
      dataSource: "LIVE_RPC",
      priceSource: "estimated",
      chainIndex: 196,
      evmChainId: 1952,
    };

    if (okbAssetIndex >= 0) {
      finalAssets[okbAssetIndex] = liveOkbAsset;
    } else {
      finalAssets.unshift(liveOkbAsset);
    }
    isLive = true;
  } catch (rpcErr) {
    console.warn("X Layer RPC native balance scan failed:", rpcErr);
  }

  const totalValue = finalAssets.reduce((sum, a) => sum + a.value, 0);

  return {
    assets: finalAssets,
    rpcStatus: isLive ? "online" : "offline",
    totalValue,
  };
}
