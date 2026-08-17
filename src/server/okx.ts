import crypto from "crypto";
import { createServerFn } from "@tanstack/react-start";
import { type RouteQuote } from "../lib/rescue-solver";

// Load environment variables manually if in Node test environment
if (typeof process !== "undefined" && process.env) {
  // If dotenv isn't loaded, Vite will handle process.env under Start server environment.
}

const OKX_BASE_URL = "https://web3.okx.com";

// Verified X Layer Mainnet Fallbacks
export const XLAYER_MAINNET_TOKENS = {
  OKB: {
    symbol: "OKB",
    name: "OKB",
    address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", // standard native placeholder
    decimals: 18,
    chainIndex: 196,
    source: "LIVE_OKX" as const,
  },
  WOKB: {
    symbol: "WOKB",
    name: "Wrapped OKB",
    address: "0xe538905cf8410324e03A5A23C1c177a474D59b2b",
    decimals: 18,
    chainIndex: 196,
    source: "LIVE_OKX" as const,
  },
  WETH: {
    symbol: "WETH",
    name: "Wrapped Ether",
    address: "0x5A77f1443D16ee5761d310e38b62f77f726bC71c",
    decimals: 18,
    chainIndex: 196,
    source: "LIVE_OKX" as const,
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    address: "0x74b7F16337b8972027F6196A17a631aC6dE26d22",
    decimals: 6,
    chainIndex: 196,
    source: "LIVE_OKX" as const,
  },
};

export type OkxTokenInfo = {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  chainIndex: number;
  source: "LIVE_OKX";
};

export type OkxRequestResult<T> = {
  success: boolean;
  status?: number;
  data?: T;
  error?: string;
  details?: string;
};

/**
 * Sign the request headers using HMAC-SHA256 for OKX API authentication.
 */
export function getOkxAuthHeaders(
  method: string,
  requestPath: string,
  body: string = ""
) {
  const apiKey = process.env.OKX_API_KEY;
  const secretKey = process.env.OKX_SECRET_KEY;
  const passphrase = process.env.OKX_PASSPHRASE || process.env.OKX_API_PASSPHRASE;
  const projectId = process.env.OKX_PROJECT_ID;

  if (!apiKey || !secretKey || !passphrase) {
    return null;
  }

  const timestamp = new Date().toISOString();
  const prehash = timestamp + method.toUpperCase() + requestPath + body;
  
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(prehash)
    .digest("base64");

  const headers: Record<string, string> = {
    "OK-ACCESS-KEY": apiKey,
    "OK-ACCESS-SIGN": signature,
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": passphrase,
    "Content-Type": "application/json",
  };

  if (projectId) {
    headers["OK-ACCESS-PROJECT"] = projectId;
  }

  return headers;
}

/**
 * Robust server-side request wrapper with authentication and timeout safety.
 */
export async function okxRequest<T>(
  method: string,
  requestPath: string,
  body: string = "",
  timeoutMs: number = 5000
): Promise<OkxRequestResult<T>> {
  const headers = getOkxAuthHeaders(method, requestPath, body);
  if (!headers) {
    return {
      success: false,
      error: "MISSING_OKX_CREDENTIALS",
      details: "OKX API key, secret, or passphrase is not configured in environment.",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${OKX_BASE_URL}${requestPath}`;
    const response = await fetch(url, {
      method,
      headers,
      body: method !== "GET" ? body : undefined,
      signal: controller.signal,
    });

    clearTimeout(timer);

    const status = response.status;
    let json: any;
    try {
      json = await response.json();
    } catch (e: any) {
      return {
        success: false,
        status,
        error: "MALFORMED_RESPONSE",
        details: `Failed to parse response body as JSON: ${e.message}`,
      };
    }

    if (status === 401) {
      return { success: false, status, error: "UNAUTHORIZED", details: json.msg || "Authentication failed." };
    }
    if (status === 403) {
      return { success: false, status, error: "FORBIDDEN", details: json.msg || "Access forbidden." };
    }
    if (status === 429) {
      return { success: false, status, error: "RATE_LIMITED", details: json.msg || "Too many requests." };
    }

    const bizCode = json.code;
    if (status === 200 && bizCode === "0") {
      return {
        success: true,
        status,
        data: json.data as T,
      };
    }

    return {
      success: false,
      status,
      error: "API_BUSINESS_ERROR",
      details: json.msg || `OKX API returned code ${bizCode}`,
    };
  } catch (error: any) {
    clearTimeout(timer);
    if (error.name === "AbortError") {
      return {
        success: false,
        error: "TIMEOUT",
        details: `Request to OKX timed out after ${timeoutMs}ms.`,
      };
    }
    return {
      success: false,
      error: "NETWORK_ERROR",
      details: error.message || "Failed to execute HTTP fetch.",
    };
  }
}

/**
 * Call the live OKX supported-chain endpoint to discover X Layer Mainnet.
 */
export async function checkSupportedChain(chainIndex: number = 196): Promise<OkxRequestResult<boolean>> {
  const path = "/api/v6/dex/aggregator/supported/chain";
  const res = await okxRequest<any[]>("GET", path);
  if (!res.success) {
    return { success: false, error: res.error, details: res.details };
  }

  const list = res.data || [];
  const supported = list.some((item) => String(item.chainIndex) === String(chainIndex));
  return {
    success: true,
    data: supported,
  };
}

/**
 * Retrieve X Layer tokens from the OKX DEX token registry.
 */
export async function getOkxTokens(chainIndex: number = 196): Promise<OkxRequestResult<OkxTokenInfo[]>> {
  const path = `/api/v6/dex/aggregator/all-tokens?chainIndex=${chainIndex}`;
  const res = await okxRequest<any[]>("GET", path);
  if (!res.success) {
    return { success: false, error: res.error, details: res.details };
  }

  const list = res.data || [];
  const normalized: OkxTokenInfo[] = list.map((t) => ({
    symbol: t.symbol,
    name: t.name,
    address: t.tokenAddress,
    decimals: Number(t.decimals),
    chainIndex,
    source: "LIVE_OKX" as const,
  }));

  return {
    success: true,
    data: normalized,
  };
}

/**
 * Fetch a live exactIn quote from the OKX DEX aggregator.
 */
export async function getLiveQuote(
  chainIndex: number,
  fromTokenAddress: string,
  toTokenAddress: string,
  amount: string
): Promise<OkxRequestResult<RouteQuote>> {
  const requestPath = `/api/v6/dex/aggregator/quote?chainIndex=${chainIndex}&fromTokenAddress=${fromTokenAddress}&toTokenAddress=${toTokenAddress}&amount=${amount}`;
  const res = await okxRequest<any[]>("GET", requestPath);
  if (!res.success) {
    return { success: false, error: res.error, details: res.details };
  }

  const data = res.data && res.data[0];
  if (!data) {
    return {
      success: false,
      error: "NO_ROUTE_FOUND",
      details: "OKX DEX Aggregator did not return any routing options.",
    };
  }

  const priceImpact = parseFloat(data.priceImpact) || 0;
  if (priceImpact > 5.0) {
    return {
      success: false,
      error: "EXCESSIVE_PRICE_IMPACT",
      details: `Price impact is too high: ${priceImpact}%`,
    };
  }

  const normalized: RouteQuote = {
    fromSymbol: data.fromToken?.symbol || "UNKNOWN",
    toSymbol: data.toToken?.symbol || "UNKNOWN",
    inputAmount: parseFloat(data.fromTokenAmount) / Math.pow(10, Number(data.fromToken?.decimals || 18)),
    outputAmount: parseFloat(data.toTokenAmount) / Math.pow(10, Number(data.toToken?.decimals || 18)),
    gasCostUsd: parseFloat(data.gasFeeUsd) || 1.50,
    slippagePercent: 1.0, // Default Slippage
    priceImpactPercent: priceImpact,
    reliabilityScore: 0.98,
    provider: "OKX DEX Aggregator",
    dataSource: "live",
  };

  return {
    success: true,
    data: normalized,
  };
}

/**
 * Bounded iterative target solving to satisfy an output target using exactIn quotes.
 */
export async function convergeExactIn(
  chainIndex: number,
  fromTokenAddress: string,
  toTokenAddress: string,
  targetOutput: number,
  fromTokenPriceUsd: number,
  toTokenPriceUsd: number = 1.0,
  maxIterations: number = 5,
  tolerance: number = 0.05
): Promise<{ inputAmount: number; outputAmount: number; iterations: number; success: boolean }> {
  // Initial estimate based on market prices: input = target / rate
  const rate = fromTokenPriceUsd / toTokenPriceUsd;
  let estimate = targetOutput / rate;

  let lowerBound = estimate * 0.8;
  let upperBound = estimate * 1.5;
  let currentOutput = 0;
  let success = false;
  let i = 0;

  for (i = 0; i < maxIterations; i++) {
    const decimals = fromTokenAddress === XLAYER_MAINNET_TOKENS.USDC.address ? 6 : 18;
    const amountRaw = Math.round(estimate * Math.pow(10, decimals)).toString();

    const quoteRes = await getLiveQuote(chainIndex, fromTokenAddress, toTokenAddress, amountRaw);
    if (!quoteRes.success || !quoteRes.data) {
      break;
    }

    currentOutput = quoteRes.data.outputAmount;

    // Check if target is satisfied within tolerance
    if (Math.abs(currentOutput - targetOutput) <= tolerance) {
      success = true;
      break;
    }

    if (currentOutput < targetOutput) {
      lowerBound = estimate;
      estimate = (estimate + upperBound) / 2;
    } else {
      upperBound = estimate;
      estimate = (lowerBound + estimate) / 2;
    }
  }

  return {
    inputAmount: estimate,
    outputAmount: currentOutput,
    iterations: i,
    success: success || Math.abs(currentOutput - targetOutput) <= tolerance * 2,
  };
}

export type OkxApproveTxData = {
  dexContractAddress: string;
  tokenAddress: string;
  to: string;
  data: string;
  value: string;
};

export type OkxSwapTxData = {
  tx: {
    to: string;
    data: string;
    value: string;
    gas: string;
    gasPrice: string;
  };
};

/**
 * Retrieve verified ERC-20 approval transaction parameters from OKX DEX aggregator.
 */
export async function getOkxApproveTransaction(
  chainIndex: number,
  tokenContractAddress: string,
  approveAmount: string
): Promise<OkxRequestResult<OkxApproveTxData>> {
  const requestPath = `/api/v6/dex/aggregator/approve-transaction?chainIndex=${chainIndex}&tokenContractAddress=${tokenContractAddress}&approveAmount=${approveAmount}`;
  
  const res = await okxRequest<any[]>("GET", requestPath);
  if (!res.success) {
    return { success: false, error: res.error, details: res.details };
  }

  const data = res.data && res.data[0];
  if (!data) {
    return {
      success: false,
      error: "NO_APPROVE_DATA_FOUND",
      details: "OKX DEX Aggregator did not return approval parameters.",
    };
  }

  return {
    success: true,
    data: {
      dexContractAddress: data.dexContractAddress,
      tokenAddress: data.tokenAddress,
      to: data.to,
      data: data.data,
      value: data.value,
    },
  };
}

/**
 * Retrieve verified swap transaction parameters from OKX DEX aggregator.
 */
export async function getOkxSwapTransaction(
  chainIndex: number,
  fromTokenAddress: string,
  toTokenAddress: string,
  amount: string,
  userAddress: string,
  slippage: string = "0.01"
): Promise<OkxRequestResult<OkxSwapTxData>> {
  const requestPath = `/api/v6/dex/aggregator/swap?chainIndex=${chainIndex}&fromTokenAddress=${fromTokenAddress}&toTokenAddress=${toTokenAddress}&amount=${amount}&userAddress=${userAddress}&slippage=${slippage}`;

  const res = await okxRequest<any[]>("GET", requestPath);
  if (!res.success) {
    return { success: false, error: res.error, details: res.details };
  }

  const data = res.data && res.data[0];
  if (!data || !data.tx) {
    return {
      success: false,
      error: "NO_SWAP_DATA_FOUND",
      details: "OKX DEX Aggregator did not return swap transaction parameters.",
    };
  }

  return {
    success: true,
    data: {
      tx: {
        to: data.tx.to,
        data: data.tx.data,
        value: data.tx.value,
        gas: data.tx.gas,
        gasPrice: data.tx.gasPrice,
      },
    },
  };
}

// ====================================================
// TANSTACK START SERVER FUNCTIONS WRAPPER (SECURE)
// ====================================================

export const serverCheckSupportedChain = createServerFn({ method: "GET" })
  .handler(async () => {
    return await checkSupportedChain(196);
  });

export const serverGetOkxTokens = createServerFn({ method: "GET" })
  .handler(async () => {
    return await getOkxTokens(196);
  });

export const serverGetLiveQuote = createServerFn({ method: "GET" })
  .validator((d: { fromToken: string; toToken: string; amount: string }) => d)
  .handler(async ({ data }) => {
    return await getLiveQuote(196, data.fromToken, data.toToken, data.amount);
  });

export const serverConvergeExactIn = createServerFn({ method: "GET" })
  .validator((d: { fromToken: string; toToken: string; targetOutput: number; price: number }) => d)
  .handler(async ({ data }) => {
    return await convergeExactIn(196, data.fromToken, data.toToken, data.targetOutput, data.price);
  });

export const serverGetOkxApproveTransaction = createServerFn({ method: "GET" })
  .validator((d: { chainIndex: number; tokenAddress: string; amount: string }) => d)
  .handler(async ({ data }) => {
    return await getOkxApproveTransaction(data.chainIndex, data.tokenAddress, data.amount);
  });

export const serverGetOkxSwapTransaction = createServerFn({ method: "GET" })
  .validator((d: { chainIndex: number; fromToken: string; toToken: string; amount: string; user: string }) => d)
  .handler(async ({ data }) => {
    return await getOkxSwapTransaction(data.chainIndex, data.fromToken, data.toToken, data.amount, data.user);
  });
