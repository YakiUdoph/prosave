import { parseSaveIntent } from "../src/lib/intent-parser";

interface TestCase {
  description: string;
  input: string;
  expected: {
    targetAsset?: string | null;
    targetAmount?: number | null;
    protectedAssets?: string[];
    protectedAssetPolicy?: string;
    objective?: string;
    urgency?: string;
    shouldWarn?: boolean;
    confidenceMin?: number;
  };
}

const testCases: TestCase[] = [
  {
    description: "A. Canonical intent with LAST_RESORT policy",
    input: "Get me $700 USDC. Don't sell my ETH unless necessary.",
    expected: {
      targetAsset: "USDC",
      targetAmount: 700,
      protectedAssets: ["ETH"],
      protectedAssetPolicy: "LAST_RESORT",
      objective: "MINIMIZE_DAMAGE",
      urgency: "NORMAL",
      shouldWarn: false,
      confidenceMin: 0.9,
    },
  },
  {
    description: "B. Strict asset protection policy",
    input: "Get me 500 USDC and don't sell ETH.",
    expected: {
      targetAsset: "USDC",
      targetAmount: 500,
      protectedAssets: ["ETH"],
      protectedAssetPolicy: "STRICT",
      objective: "MINIMIZE_DAMAGE",
      urgency: "NORMAL",
      shouldWarn: false,
      confidenceMin: 0.9,
    },
  },
  {
    description: "C. Risk-reduction objective classification",
    input: "Reduce my portfolio risk by 50%.",
    expected: {
      targetAsset: null,
      targetAmount: null,
      protectedAssets: [],
      objective: "REDUCE_RISK",
      urgency: "NORMAL",
      shouldWarn: false,
      confidenceMin: 0.9,
    },
  },
  {
    description: "D. Exposure exit objective classification",
    input: "Exit my meme coin exposure.",
    expected: {
      targetAsset: null,
      targetAmount: null,
      protectedAssets: [],
      objective: "EXIT_EXPOSURE",
      urgency: "NORMAL",
      shouldWarn: false,
      confidenceMin: 0.9,
    },
  },
  {
    description: "E. Numeric comma-separated amount and high urgency detection",
    input: "I need $1,250.75 USDC now.",
    expected: {
      targetAsset: "USDC",
      targetAmount: 1250.75,
      protectedAssets: [],
      objective: "MINIMIZE_DAMAGE",
      urgency: "HIGH",
      shouldWarn: false,
      confidenceMin: 0.9,
    },
  },
  {
    description: "F. Invalid / empty request fails safely",
    input: "",
    expected: {
      targetAsset: null,
      targetAmount: null,
      protectedAssets: [],
      shouldWarn: true,
      confidenceMin: 0.0,
    },
  },
  {
    description: "G. Complex phrased input verification",
    input: "Convert enough of my portfolio to get $700 USDC but keep ETH.",
    expected: {
      targetAsset: "USDC",
      targetAmount: 700,
      protectedAssets: ["ETH"],
      protectedAssetPolicy: "STRICT",
      objective: "MINIMIZE_DAMAGE",
      confidenceMin: 0.9,
    },
  },
];

function runTests() {
  console.log("==================================================");
  console.log("             RUNNING INTENT PARSER TESTS          ");
  console.log("==================================================");

  let passedCount = 0;

  for (const tc of testCases) {
    console.log(`\nTest Case: ${tc.description}`);
    console.log(`Input: "${tc.input}"`);

    const result = parseSaveIntent(tc.input);

    let passed = true;
    const failures: string[] = [];

    // Verify Target Asset
    if (tc.expected.targetAsset !== undefined && result.targetAsset !== tc.expected.targetAsset) {
      passed = false;
      failures.push(`Expected targetAsset to be ${tc.expected.targetAsset}, got ${result.targetAsset}`);
    }

    // Verify Target Amount
    if (tc.expected.targetAmount !== undefined && result.targetAmount !== tc.expected.targetAmount) {
      passed = false;
      failures.push(`Expected targetAmount to be ${tc.expected.targetAmount}, got ${result.targetAmount}`);
    }

    // Verify Protected Assets
    if (tc.expected.protectedAssets !== undefined) {
      const allFound = tc.expected.protectedAssets.every((a) => result.protectedAssets.includes(a));
      const sameLength = tc.expected.protectedAssets.length === result.protectedAssets.length;
      if (!allFound || !sameLength) {
        passed = false;
        failures.push(`Expected protectedAssets to be [${tc.expected.protectedAssets.join(", ")}], got [${result.protectedAssets.join(", ")}]`);
      }
    }

    // Verify Protected Asset Policy
    if (tc.expected.protectedAssetPolicy !== undefined && result.protectedAssetPolicy !== tc.expected.protectedAssetPolicy) {
      passed = false;
      failures.push(`Expected protectedAssetPolicy to be ${tc.expected.protectedAssetPolicy}, got ${result.protectedAssetPolicy}`);
    }

    // Verify Objective
    if (tc.expected.objective !== undefined && result.objective !== tc.expected.objective) {
      passed = false;
      failures.push(`Expected objective to be ${tc.expected.objective}, got ${result.objective}`);
    }

    // Verify Urgency
    if (tc.expected.urgency !== undefined && result.urgency !== tc.expected.urgency) {
      passed = false;
      failures.push(`Expected urgency to be ${tc.expected.urgency}, got ${result.urgency}`);
    }

    // Verify Confidence
    if (tc.expected.confidenceMin !== undefined && result.confidence < tc.expected.confidenceMin) {
      passed = false;
      failures.push(`Expected confidence of at least ${tc.expected.confidenceMin}, got ${result.confidence}`);
    }

    // Verify Warnings
    if (tc.expected.shouldWarn !== undefined) {
      const hasWarnings = result.warnings.length > 0;
      if (tc.expected.shouldWarn && !hasWarnings) {
        passed = false;
        failures.push(`Expected warnings to be present, but warnings array was empty`);
      } else if (!tc.expected.shouldWarn && hasWarnings) {
        passed = false;
        failures.push(`Expected no warnings, but got warnings: [${result.warnings.join("; ")}]`);
      }
    }

    if (passed) {
      console.log("✅ PASSED");
      passedCount++;
    } else {
      console.log("❌ FAILED");
      failures.forEach((f) => console.log(`   - ${f}`));
    }
  }

  console.log("\n==================================================");
  console.log(`Summary: ${passedCount} / ${testCases.length} Tests Passed`);
  console.log("==================================================");

  if (passedCount !== testCases.length) {
    process.exit(1);
  }
}

runTests();
