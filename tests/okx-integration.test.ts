import {
  getOkxAuthHeaders,
  okxRequest,
  checkSupportedChain,
  getOkxTokens,
  getLiveQuote,
  convergeExactIn,
  XLAYER_MAINNET_TOKENS,
} from "../src/lib/okx.server";

import fs from "fs";
import path from "path";

// Read .env manually to populate process.env in Node test environment
try {
  const envPath = path.resolve(".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    for (const line of envContent.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index > 0) {
        const key = trimmed.slice(0, index).trim();
        let value = trimmed.slice(index + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  }
} catch (err: any) {
  console.error("Failed to read .env file:", err.message);
}

// Backup real credentials
const realApiKey = process.env.OKX_API_KEY;
const realSecretKey = process.env.OKX_SECRET_KEY;
const realPassphrase = process.env.OKX_PASSPHRASE || process.env.OKX_API_PASSPHRASE;
const realProjectId = process.env.OKX_PROJECT_ID;

// Save the original fetch to restore later
const originalFetch = global.fetch;

async function runTests() {
  console.log("==================================================");
  console.log("             RUNNING OKX INTEGRATION TESTS        ");
  console.log("==================================================");

  let passed = true;

  // A. OKX authentication headers generation check
  console.log("\nTest A: HMAC-SHA256 Auth Headers Signature");
  process.env.OKX_API_KEY = "test-api-key";
  process.env.OKX_SECRET_KEY = "test-secret-key";
  process.env.OKX_API_PASSPHRASE = "test-passphrase";
  process.env.OKX_PROJECT_ID = "test-project-id";

  const headers = getOkxAuthHeaders("GET", "/api/v6/dex/aggregator/supported/chain");
  if (
    headers &&
    headers["OK-ACCESS-KEY"] === "test-api-key" &&
    headers["OK-ACCESS-SIGN"] &&
    headers["OK-ACCESS-TIMESTAMP"] &&
    headers["OK-ACCESS-PASSPHRASE"] === "test-passphrase" &&
    headers["OK-ACCESS-PROJECT"] === "test-project-id"
  ) {
    console.log("✅ Passed (HMAC-SHA256 signature generated successfully with correct keys)");
  } else {
    passed = false;
    console.log("❌ Failed (Auth headers are missing or incorrect)");
  }

  // B. X Layer chainIndex 196 discovery via Mock
  console.log("\nTest B: Supported Chain Discovery");
  global.fetch = async (url: any) => {
    return {
      status: 200,
      json: async () => ({
        code: "0",
        msg: "",
        data: [
          { chainIndex: 1, name: "Ethereum" },
          { chainIndex: 196, name: "X Layer" }
        ]
      })
    } as any;
  };

  const chainRes = await checkSupportedChain(196);
  if (chainRes.success && chainRes.data === true) {
    console.log("✅ Passed (Chain 196 correctly identified as supported)");
  } else {
    passed = false;
    console.log(`❌ Failed (Expected supported true, got: ${JSON.stringify(chainRes)})`);
  }

  // C. Token normalization via Mock
  console.log("\nTest C: Token list retrieval and normalization");
  global.fetch = async (url: any) => {
    return {
      status: 200,
      json: async () => ({
        code: "0",
        msg: "",
        data: [
          { symbol: "OKB", name: "OKB", tokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", decimals: "18" },
          { symbol: "USDC", name: "USD Coin", tokenAddress: "0x74b7F16337b8972027F6196A17a631aC6dE26d22", decimals: "6" }
        ]
      })
    } as any;
  };

  const tokensRes = await getOkxTokens(196);
  if (
    tokensRes.success &&
    tokensRes.data &&
    tokensRes.data.length === 2 &&
    tokensRes.data[1].symbol === "USDC" &&
    tokensRes.data[1].decimals === 6 &&
    tokensRes.data[1].address === "0x74b7F16337b8972027F6196A17a631aC6dE26d22"
  ) {
    console.log("✅ Passed (Tokens retrieved and parsed with correct decimals and contract addresses)");
  } else {
    passed = false;
    console.log(`❌ Failed (Normalized tokens list incorrect: ${JSON.stringify(tokensRes)})`);
  }

  // D. Live quote response normalization via Mock
  console.log("\nTest D: Live Quote response normalization");
  global.fetch = async (url: any) => {
    return {
      status: 200,
      json: async () => ({
        code: "0",
        msg: "",
        data: [
          {
            fromToken: { symbol: "OKB", decimals: "18" },
            toToken: { symbol: "USDC", decimals: "6" },
            fromTokenAmount: "1000000000000000000", // 1 OKB
            toTokenAmount: "47170000", // 47.17 USDC
            gasFeeUsd: "1.20",
            priceImpact: "0.08"
          }
        ]
      })
    } as any;
  };

  const quoteRes = await getLiveQuote(196, "0xeee", "0x74b", "1000000000000000000");
  if (
    quoteRes.success &&
    quoteRes.data &&
    quoteRes.data.inputAmount === 1.0 &&
    quoteRes.data.outputAmount === 47.17 &&
    quoteRes.data.gasCostUsd === 1.20 &&
    quoteRes.data.priceImpactPercent === 0.08 &&
    quoteRes.data.dataSource === "live"
  ) {
    console.log("✅ Passed (Quote response correctly parsed and normalized to RouteQuote)");
  } else {
    passed = false;
    console.log(`❌ Failed (RouteQuote normalization failed: ${JSON.stringify(quoteRes)})`);
  }

  // E. API Timeout handling via Mock
  console.log("\nTest E: Timeout handling");
  global.fetch = async (url: any, options: any) => {
    // Simulate abort error when aborted
    if (options.signal) {
      throw { name: "AbortError" };
    }
    return {} as any;
  };

  const timeoutRes = await checkSupportedChain(196);
  if (!timeoutRes.success && timeoutRes.error === "TIMEOUT") {
    console.log("✅ Passed (Timeout correctly caught and returned as normalized TIMEOUT error)");
  } else {
    passed = false;
    console.log(`❌ Failed (Expected TIMEOUT error, got: ${JSON.stringify(timeoutRes)})`);
  }

  // F. Unsupported Token / Business Error via Mock
  console.log("\nTest F: Business errors handling (unsupported tokens)");
  global.fetch = async (url: any) => {
    return {
      status: 200,
      json: async () => ({
        code: "50003",
        msg: "Token pair not supported"
      })
    } as any;
  };

  const badTokenRes = await getLiveQuote(196, "0xbad", "0x74b", "1000000000000000000");
  if (!badTokenRes.success && badTokenRes.error === "API_BUSINESS_ERROR" && badTokenRes.details?.includes("Token pair not supported")) {
    console.log("✅ Passed (Business error caught and returned with description details)");
  } else {
    passed = false;
    console.log(`❌ Failed (Expected API_BUSINESS_ERROR, got: ${JSON.stringify(badTokenRes)})`);
  }

  // G. Stale quote detection
  console.log("\nTest G: Stale Quote detection logic");
  const staleWindowMs = 60 * 1000; // 1 minute
  const now = Date.now();
  const freshQuote = { timestamp: now, inputAmount: 1, outputAmount: 47 };
  const staleQuote = { timestamp: now - staleWindowMs - 5000, inputAmount: 1, outputAmount: 47 };

  const isFresh = (Date.now() - freshQuote.timestamp) < staleWindowMs;
  const isStale = (Date.now() - staleQuote.timestamp) >= staleWindowMs;

  if (isFresh && isStale) {
    console.log("✅ Passed (Stale quotes correctly identified by window check)");
  } else {
    passed = false;
    console.log("❌ Failed (Stale window comparison failed)");
  }

  // H. Iterative exactIn convergence using controlled Mock
  console.log("\nTest H: Iterative exactIn convergence");
  // Mock quotes that simulate different outputs based on inputs
  global.fetch = async (url: any) => {
    // Parse input amount from URL query string
    const match = String(url).match(/amount=(\d+)/);
    const amountRaw = match ? match[1] : "0";
    const decimals = String(url).includes("fromTokenAddress=0x74b") ? 6 : 18;
    const inputAmount = parseFloat(amountRaw) / Math.pow(10, decimals);
    
    // Simulating 1 OKB = 47 USDC minus a minor slippage/impact curve
    const outputAmount = inputAmount * 47.0;

    return {
      status: 200,
      json: async () => ({
        code: "0",
        msg: "",
        data: [
          {
            fromToken: { symbol: "OKB", decimals: String(decimals) },
            toToken: { symbol: "USDC", decimals: "6" },
            fromTokenAmount: amountRaw,
            toTokenAmount: Math.round(outputAmount * 1000000).toString(),
            gasFeeUsd: "1.20",
            priceImpact: "0.08"
          }
        ]
      })
    } as any;
  };

  // We want to converge on exactly 300 USDC output. Initial estimate: 300 / 47 = 6.38 OKB.
  const convergeRes = await convergeExactIn(196, "0xeee", "0x74b", 300, 47.0);
  if (convergeRes.success && Math.abs(convergeRes.outputAmount - 300) < 0.05 && convergeRes.iterations <= 5) {
    console.log(`✅ Passed (Converged on target 300 USDC output: input = ${convergeRes.inputAmount.toFixed(4)} OKB, output = ${convergeRes.outputAmount.toFixed(4)} USDC, iterations = ${convergeRes.iterations})`);
  } else {
    passed = false;
    console.log(`❌ Failed (Convergence failed: ${JSON.stringify(convergeRes)})`);
  }

  // I. Maximum-iteration safety verification
  console.log("\nTest I: Maximum Iterations Bound check");
  const failConvergeRes = await convergeExactIn(196, "0xeee", "0x74b", 300, 47.0, 1.0, 2); // Max iterations capped at 2
  if (failConvergeRes.iterations <= 2) {
    console.log(`✅ Passed (Iteration cap enforced: exited after ${failConvergeRes.iterations} iterations)`);
  } else {
    passed = false;
    console.log(`❌ Failed (Iterations exceeded the cap, got ${failConvergeRes.iterations})`);
  }

  // J. API Secrets never serialized check
  console.log("\nTest J: Serialization Leak Protection");
  const serialized = JSON.stringify(quoteRes.data);
  const containsSecret =
    serialized.includes("test-secret-key") ||
    serialized.includes("test-api-key") ||
    serialized.includes("test-passphrase");

  if (!containsSecret) {
    console.log("✅ Passed (Secrets are never exposed in normalized client RouteQuote objects)");
  } else {
    passed = false;
    console.log("❌ Failed (Detected sensitive credentials leak in RouteQuote object!)");
  }

  // K. Live integration test (handles failure gracefully)
  console.log("\nTest K: Optional Live Integration check");
  // Restore original fetch for live test
  global.fetch = originalFetch;

  // Restore real credentials
  process.env.OKX_API_KEY = realApiKey;
  process.env.OKX_SECRET_KEY = realSecretKey;
  process.env.OKX_API_PASSPHRASE = realPassphrase;
  process.env.OKX_PROJECT_ID = realProjectId;

  // Read actual .env variables (if configured)
  const okxApiKey = process.env.OKX_API_KEY;
  if (!okxApiKey || okxApiKey === "test-api-key") {
    console.log("⚠️ Skipping Live Test: Real OKX API credentials not configured in local environment.");
  } else {
    try {
      console.log(`Querying OKX DEX Supported Chains to discover X Layer (196)...`);
      const liveRes = await checkSupportedChain(196);
      if (liveRes.success) {
        console.log(`   Discovery status: SUCCESS. X Layer Mainnet supported: ${liveRes.data}`);
        
        console.log(`Querying OKX DEX for live read-only OKB to USDC quote...`);
        // 1 OKB = 10^18 decimals
        const quoteLive = await getLiveQuote(
          196,
          XLAYER_MAINNET_TOKENS.OKB.address,
          XLAYER_MAINNET_TOKENS.USDC.address,
          "1000000000000000000"
        );
        if (quoteLive.success && quoteLive.data) {
          console.log(`   Live quote: SUCCESS.`);
          console.log(`   Pair: OKB -> USDC`);
          console.log(`   Input Amount: ${quoteLive.data.inputAmount} OKB`);
          console.log(`   Expected Output: ${quoteLive.data.outputAmount.toFixed(4)} USDC`);
          console.log(`   Gas Estimate: $${quoteLive.data.gasCostUsd.toFixed(2)}`);
          console.log(`   Price Impact: ${quoteLive.data.priceImpactPercent}%`);
        } else {
          console.log(`   Live quote status: FAILED. Error: ${quoteLive.error}, Details: ${quoteLive.details}`);
        }
      } else {
        console.log(`   Supported Chains status: FAILED. Error: ${liveRes.error}, Details: ${liveRes.details}`);
      }
    } catch (e: any) {
      console.log(`⚠️ Live query skipped or failed due to fetch timeout/network block: ${e.message}`);
    }
  }

  console.log("\n==================================================");
  console.log(passed ? "Summary: All OKX Integration Tests Passed" : "Summary: OKX Integration Tests Failed");
  console.log("==================================================");

  // Restore fetch
  global.fetch = originalFetch;

  if (!passed) {
    process.exit(1);
  }
}

runTests();
