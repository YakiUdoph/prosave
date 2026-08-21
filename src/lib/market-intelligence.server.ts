import { createServerFn } from "@tanstack/react-start";
import { getLiveQuote, getOkxTokens } from "./okx.server";
import type { QuoteReference, RouteQuote } from "./rescue-solver";

export const OKX_REFERENCE_MAX_AGE_MS = 60_000;

export type QuoteRequest = {
  assetKey: string;
  chainIndex: number;
  fromTokenAddress: string;
  fromDecimals: number;
  toTokenAddress: string;
  amount: number;
};

export type PublicFallbackReason =
  | "OKX_UNAVAILABLE"
  | "OKX_TIMEOUT"
  | "RATE_LIMITED"
  | "UNSUPPORTED_ASSET"
  | "UNSUPPORTED_PAIR"
  | "MALFORMED_RESPONSE"
  | "STALE_QUOTE"
  | "IDENTITY_MISMATCH"
  | "CHAIN_MISMATCH"
  | "INVALID_AMOUNT";

export function normalizeFallbackReason(reason?: string): PublicFallbackReason {
  if (reason === "TIMEOUT" || reason === "STALE_REQUOTE_FAILED") return "OKX_TIMEOUT";
  if (reason === "RATE_LIMITED") return "RATE_LIMITED";
  if (reason === "MALFORMED_RESPONSE" || reason === "INVALID_QUOTE" || reason === "ZERO_OR_MALFORMED_ROUTE") return "MALFORMED_RESPONSE";
  if (reason === "STALE_OKX_QUOTE") return "STALE_QUOTE";
  if (reason === "QUOTE_IDENTITY_MISMATCH") return "IDENTITY_MISMATCH";
  if (reason === "CHAIN_MISMATCH") return "CHAIN_MISMATCH";
  if (reason === "INVALID_DECIMALS_OR_AMOUNT") return "INVALID_AMOUNT";
  if (reason === "UNSUPPORTED_ASSET_IDENTITY") return "UNSUPPORTED_ASSET";
  if (reason === "UNSUPPORTED_TOKEN_OR_PAIR" || reason === "NO_ROUTE_FOUND" || reason === "API_BUSINESS_ERROR") return "UNSUPPORTED_PAIR";
  return "OKX_UNAVAILABLE";
}

export function toBaseUnits(amount: number, decimals: number): string {
  const [whole, fraction = ""] = amount.toFixed(Math.min(decimals, 18)).split(".");
  return `${whole}${fraction.padEnd(decimals, "0")}`.replace(/^0+(?=\d)/, "");
}

type ReadOnlyDependencies = {
  getTokens: typeof getOkxTokens;
  getQuote: typeof getLiveQuote;
  now: () => number;
};

const defaultDependencies: ReadOnlyDependencies = { getTokens: getOkxTokens, getQuote: getLiveQuote, now: Date.now };

export async function getReadOnlyQuoteReferences(
  requests: QuoteRequest[],
  dependencies: ReadOnlyDependencies = defaultDependencies,
): Promise<QuoteReference[]> {
  if (requests.length === 0) return [];
  const tokenResults = new Map<number, Awaited<ReturnType<typeof getOkxTokens>>>();
  const references: QuoteReference[] = [];
  const fallback = (request: QuoteRequest, reason?: string): QuoteReference => ({
    assetKey: request.assetKey,
    requestedAmount: request.amount,
    fallbackReason: normalizeFallbackReason(reason),
  });

  for (const request of requests) {
    if (request.chainIndex !== 196) {
      references.push(fallback(request, "CHAIN_MISMATCH"));
      continue;
    }
    if (!Number.isInteger(request.fromDecimals) || request.fromDecimals < 0 || request.fromDecimals > 255 || request.amount <= 0) {
      references.push(fallback(request, "INVALID_DECIMALS_OR_AMOUNT"));
      continue;
    }

    let registry = tokenResults.get(request.chainIndex);
    if (!registry) {
      registry = await dependencies.getTokens(request.chainIndex);
      tokenResults.set(request.chainIndex, registry);
    }
    if (!registry.success || !registry.data) {
      references.push(fallback(request, registry.error));
      continue;
    }
    const normalizedFrom = request.fromTokenAddress.toLowerCase();
    const normalizedTo = request.toTokenAddress.toLowerCase();
    const fromSupported = registry.data.some((token) => token.address.toLowerCase() === normalizedFrom);
    const toSupported = registry.data.some((token) => token.address.toLowerCase() === normalizedTo);
    if (!fromSupported || !toSupported) {
      references.push(fallback(request, "UNSUPPORTED_TOKEN_OR_PAIR"));
      continue;
    }

    const rawAmount = toBaseUnits(request.amount, request.fromDecimals);
    let result = await dependencies.getQuote(196, request.fromTokenAddress, request.toTokenAddress, rawAmount);
    if (!result.success || !result.data) {
      references.push(fallback(request, result.error));
      continue;
    }
    let quote: RouteQuote = result.data;
    if (dependencies.now() - quote.timestamp >= OKX_REFERENCE_MAX_AGE_MS) {
      result = await dependencies.getQuote(196, request.fromTokenAddress, request.toTokenAddress, rawAmount);
      if (!result.success || !result.data) {
        references.push(fallback(request, result.error || "STALE_REQUOTE_FAILED"));
        continue;
      }
      quote = result.data;
    }
    if (quote.chain.chainIndex !== 196 || quote.fromToken.address?.toLowerCase() !== normalizedFrom || quote.toToken.address?.toLowerCase() !== normalizedTo) {
      references.push(fallback(request, "QUOTE_IDENTITY_MISMATCH"));
      continue;
    }
    if (quote.availability !== "AVAILABLE" || !Number.isFinite(quote.outputAmount) || quote.outputAmount <= 0 ||
        !Number.isFinite(quote.gasCostUsd) || !Number.isFinite(quote.slippagePercent) || !Number.isFinite(quote.priceImpactPercent)) {
      references.push(fallback(request, "ZERO_OR_MALFORMED_ROUTE"));
      continue;
    }
    if (dependencies.now() - quote.timestamp >= OKX_REFERENCE_MAX_AGE_MS) {
      references.push(fallback(request, "STALE_OKX_QUOTE"));
      continue;
    }
    if (Math.abs(quote.inputAmount - request.amount) > Math.max(1e-9, request.amount * 1e-9)) {
      references.push(fallback(request, "QUOTE_IDENTITY_MISMATCH"));
      continue;
    }
    references.push({ assetKey: request.assetKey, requestedAmount: request.amount, quote: { ...quote, source: "OKX_EXACT", conservativeExpectedOutput: quote.outputAmount } });
  }
  return references;
}

export const serverGetReadOnlyQuoteReferences = createServerFn({ method: "POST" })
  .validator((requests: QuoteRequest[]) => requests)
  .handler(async ({ data }) => getReadOnlyQuoteReferences(data));
