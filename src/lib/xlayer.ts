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
    default: { http: ["https://xlayertestrpc.okx.com"] },
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

// Token contract addresses on X Layer Testnet (validated in Gates A-F)
export const TOKENS = {
  OKB: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  WETH: "0x5a77f1443d16ee5761d310e38b62f77f726bc71c",
  USDC: "0xb6ceceab302e2e4948951ee7843fc24e92933061",
};

// RPC Fallback Configuration
export const publicClient = createPublicClient({
  chain: xLayerTestnet,
  transport: fallback([
    http("https://xlayertestrpc.okx.com"),
    http("https://rpc.ankr.com/xlayer_testnet"),
  ]),
});

export type DataSource = "live" | "demo" | "estimated";

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
 * Fetches real balances on X Layer Testnet for native OKB and contract WETH/USDC.
 * Falls back to demo assets for Token X or when wallet is disconnected/RPC is down.
 */
export async function scanPortfolio(address: string | null): Promise<{
  assets: ScannedAsset[];
  rpcStatus: "online" | "offline";
  totalValue: number;
}> {
  // Default fallback reference prices
  const PRICES = {
    OKB: 47.17,    // Estimated OKB USD price
    WETH: 2871.73,  // Estimated ETH USD price
    USDC: 1.00,    // USD Coin stable value
    TKX: 0.028,    // Token X demo value
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
      note: "Long-term holding — flagged as protected",
      isNative: false, // WETH on-chain representation
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
      note: "Deep liquidity, moderate drawdown exposure",
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
      note: "Stable reserve",
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
      note: "Thin liquidity, high slippage risk",
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
    // 1. Fetch Native OKB Balance
    const okbWei = await publicClient.getBalance({ address: address as `0x${string}` });
    const okbBalance = parseFloat(formatEther(okbWei));

    // 2. Fetch contract WETH Balance
    let wethBalance = 0;
    try {
      const wethWei = await publicClient.readContract({
        address: TOKENS.WETH as `0x${string}`,
        abi: minErc20Abi,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      });
      wethBalance = parseFloat(formatEther(wethWei));
    } catch (err) {
      console.warn("WETH balance read failed, using 0:", err);
    }

    // 3. Fetch contract USDC Balance
    let usdcBalance = 0;
    try {
      const usdcRaw = await publicClient.readContract({
        address: TOKENS.USDC as `0x${string}`,
        abi: minErc20Abi,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      });
      // USDC on X Layer Testnet might be 6 decimals
      usdcBalance = parseFloat(formatUnits(usdcRaw, 6));
    } catch (err) {
      console.warn("USDC balance read failed, using 0:", err);
    }

    // Construct Scanned Assets
    // We combine the real wallet balances with the Token X demo asset so the solver is testable.
    // If the wallet balance is zero, we supplement with demo balances but clearly tag the dataSource.
    const hasOnchainAssets = okbBalance > 0 || wethBalance > 0 || usdcBalance > 0;

    const assets: ScannedAsset[] = [
      {
        symbol: "ETH",
        name: "Ethereum",
        chain: "X Layer",
        balance: hasOnchainAssets ? wethBalance.toFixed(4) : "0.842",
        value: Math.round((hasOnchainAssets ? wethBalance : 0.842) * PRICES.WETH),
        change24h: -1.2,
        liquidity: 98,
        risk: "protected",
        note: hasOnchainAssets ? "Live holding on X Layer Testnet" : "Demo holding — long-term protection target",
        isNative: false,
        isProtected: true,
        contractAddress: TOKENS.WETH,
        dataSource: hasOnchainAssets ? "live" : "demo",
        priceSource: "estimated",
      },
      {
        symbol: "OKB",
        name: "OKB",
        chain: "X Layer",
        balance: hasOnchainAssets ? okbBalance.toFixed(4) : "31.5",
        value: Math.round((hasOnchainAssets ? okbBalance : 31.5) * PRICES.OKB),
        change24h: -4.6,
        liquidity: 88,
        risk: "medium",
        note: hasOnchainAssets ? "Live OKB balance on X Layer Testnet" : "Demo holding — moderate drawdown exposure",
        isNative: true,
        isProtected: false,
        contractAddress: TOKENS.OKB,
        dataSource: hasOnchainAssets ? "live" : "demo",
        priceSource: "estimated",
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        chain: "X Layer",
        balance: hasOnchainAssets ? usdcBalance.toFixed(2) : "412.00",
        value: Math.round((hasOnchainAssets ? usdcBalance : 412.00) * PRICES.USDC),
        change24h: 0.0,
        liquidity: 100,
        risk: "protected",
        note: hasOnchainAssets ? "Live USDC balance on X Layer Testnet" : "Demo holding — stable reserve",
        isNative: false,
        isProtected: true,
        contractAddress: TOKENS.USDC,
        dataSource: hasOnchainAssets ? "live" : "demo",
        priceSource: "estimated",
      },
      {
        symbol: "TKX",
        name: "Token X",
        chain: "X Layer",
        balance: "18400", // Demountable asset always simulated for Solver routing demonstration
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
    console.error("X Layer RPC scan failed, falling back to demo values:", error);
    const total = defaultDemoAssets.reduce((sum, a) => sum + a.value, 0);
    return {
      assets: defaultDemoAssets,
      rpcStatus: "offline",
      totalValue: total,
    };
  }
}
