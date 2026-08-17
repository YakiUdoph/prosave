export type ObjectiveType =
  | "MINIMIZE_DAMAGE"
  | "REDUCE_RISK"
  | "EXIT_EXPOSURE"
  | "MAXIMIZE_LIQUIDITY";

export type UrgencyType = "NORMAL" | "HIGH" | "EMERGENCY";

export type ProtectedAssetPolicyType = "STRICT" | "LAST_RESORT";

export type SaveIntent = {
  rawInput: string;
  targetAsset: string | null;
  targetAmount: number | null;
  protectedAssets: string[];
  avoidAssets: string[];
  objective: ObjectiveType;
  urgency: UrgencyType;
  protectedAssetPolicy: ProtectedAssetPolicyType;
  confidence: number;
  warnings: string[];
};

/**
 * Deterministically parses natural-language user portfolio goals into structured intents.
 * Uses regex, normalized token matching, and phrase rules for high reliability.
 */
export function parseSaveIntent(input: string): SaveIntent {
  const normalized = input.trim();
  const lower = normalized.toLowerCase();

  const intent: SaveIntent = {
    rawInput: normalized,
    targetAsset: null,
    targetAmount: null,
    protectedAssets: [],
    avoidAssets: [],
    objective: "MINIMIZE_DAMAGE",
    urgency: "NORMAL",
    protectedAssetPolicy: "STRICT",
    confidence: 1.0,
    warnings: [],
  };

  // 1. Handle Empty Input
  if (!normalized) {
    intent.confidence = 0.0;
    intent.warnings.push("Input intent is empty.");
    return intent;
  }

  // 2. Parse Target Asset
  if (lower.includes("usdc")) {
    intent.targetAsset = "USDC";
  } else if (lower.includes("usdt")) {
    intent.targetAsset = "USDT";
  } else if (lower.includes("okb")) {
    intent.targetAsset = "OKB";
  }

  // 3. Parse Target Amount
  // Matches values like $700, 700, 700.50, 1,000, $1,250.75, 1250.75
  const amountRegex = /(?:\$|usd)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/gi;
  let match;
  let parsedAmount: number | null = null;

  while ((match = amountRegex.exec(lower)) !== null) {
    const rawVal = match[1];
    const cleanVal = rawVal.replace(/,/g, "");
    const val = parseFloat(cleanVal);

    // Filter out values that correspond to percentage inputs (e.g. 50% risk)
    const matchIndex = match.index;
    const isPercentage = lower.substring(matchIndex + match[0].length).trim().startsWith("%");

    if (!isNaN(val) && !isPercentage) {
      parsedAmount = val;
      break;
    }
  }

  if (parsedAmount !== null) {
    if (parsedAmount <= 0) {
      intent.warnings.push("Target amount must be greater than zero.");
      intent.confidence = Math.max(0.0, intent.confidence - 0.5);
    } else {
      intent.targetAmount = parsedAmount;
    }
  } else {
    // If no numeric amount is parsed, but the objective requires it (like MINIMIZE_DAMAGE)
    if (lower.includes("get") || lower.includes("need") || lower.includes("secure")) {
      intent.warnings.push("Target amount could not be parsed.");
      intent.confidence = Math.max(0.0, intent.confidence - 0.4);
    }
  }

  // 4. Parse Protected Assets (e.g. ETH, OKB)
  const ethRegex = /\b(eth|ethereum|weth)\b/gi;
  if (ethRegex.test(lower)) {
    intent.protectedAssets.push("ETH");
  }

  const okbRegex = /\b(okb)\b/gi;
  // Make sure OKB is not the target asset before protecting it
  if (okbRegex.test(lower) && intent.targetAsset !== "OKB") {
    // Only protect if explicitly instructed
    if (lower.includes("protect okb") || lower.includes("keep okb") || lower.includes("avoid selling okb")) {
      intent.protectedAssets.push("OKB");
    }
  }

  // 5. Parse Protected Asset Policy
  // "Don't sell my ETH unless necessary" -> LAST_RESORT
  const lastResortPhrases = [
    "unless necessary",
    "unless required",
    "if necessary",
    "if required",
    "last resort",
    "only if needed",
  ];
  const hasLastResort = lastResortPhrases.some((phrase) => lower.includes(phrase));
  if (hasLastResort) {
    intent.protectedAssetPolicy = "LAST_RESORT";
  } else {
    intent.protectedAssetPolicy = "STRICT";
  }

  // 6. Classify Objective
  if (lower.includes("reduce") || lower.includes("risk") || lower.includes("de-risk")) {
    intent.objective = "REDUCE_RISK";
  } else if (lower.includes("exit") || lower.includes("meme") || lower.includes("volatile")) {
    intent.objective = "EXIT_EXPOSURE";
  } else if (lower.includes("maximize") || lower.includes("liquidity") || lower.includes("most stable")) {
    intent.objective = "MAXIMIZE_LIQUIDITY";
  } else {
    intent.objective = "MINIMIZE_DAMAGE"; // Default
  }

  // 7. Parse Urgency
  const emergencyPhrases = ["emergency", "panic", "critical"];
  const highUrgencyPhrases = ["now", "urgent", "immediately", "quick"];

  if (emergencyPhrases.some((phrase) => lower.includes(phrase))) {
    intent.urgency = "EMERGENCY";
  } else if (highUrgencyPhrases.some((phrase) => lower.includes(phrase))) {
    intent.urgency = "HIGH";
  } else {
    intent.urgency = "NORMAL";
  }

  // 8. Confidence Penalization & Final Warnings
  if (intent.objective === "MINIMIZE_DAMAGE") {
    if (!intent.targetAsset) {
      intent.warnings.push("Target asset not specified.");
      intent.confidence = Math.max(0.0, intent.confidence - 0.3);
    }
    if (intent.targetAmount === null) {
      intent.warnings.push("Target amount not specified.");
      intent.confidence = Math.max(0.0, intent.confidence - 0.3);
    }
  }

  // Conflict checking: Protecting the target asset
  if (intent.targetAsset && intent.protectedAssets.includes(intent.targetAsset)) {
    intent.warnings.push(`Conflict: Asset ${intent.targetAsset} cannot be both the target asset and protected.`);
    intent.confidence = Math.max(0.0, intent.confidence - 0.5);
  }

  return intent;
}
