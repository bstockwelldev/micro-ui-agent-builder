/**
 * Rough USD estimates from token usage (not billing truth).
 * Rates are approximate; tune via env or future provider billing APIs.
 */
export type TokenRates = { inputPer1M: number; outputPer1M: number };

const DEFAULT_RATES: TokenRates = { inputPer1M: 0.5, outputPer1M: 1.5 };

function ratesForProviderAndModel(
  providerLabel: string,
  modelRef: string,
): TokenRates {
  const p = providerLabel.toLowerCase();
  const m = modelRef.toLowerCase();

  if (p.startsWith("ollama")) {
    return { inputPer1M: 0, outputPer1M: 0 };
  }
  if (p.startsWith("google")) {
    if (m.includes("flash-lite") || m.includes("flash_lite")) {
      return { inputPer1M: 0.075, outputPer1M: 0.3 };
    }
    if (m.includes("flash")) {
      return { inputPer1M: 0.15, outputPer1M: 0.6 };
    }
    return { inputPer1M: 0.5, outputPer1M: 1.5 };
  }
  if (p.startsWith("openai")) {
    if (m.includes("mini") || m.includes("nano")) {
      return { inputPer1M: 0.15, outputPer1M: 0.6 };
    }
    return { inputPer1M: 2.5, outputPer1M: 10 };
  }
  if (p.startsWith("groq")) {
    return { inputPer1M: 0.05, outputPer1M: 0.08 };
  }
  if (p.startsWith("gateway")) {
    return { inputPer1M: 0.1, outputPer1M: 0.1 };
  }
  return DEFAULT_RATES;
}

export function estimateUsdFromUsage(params: {
  providerLabel: string;
  modelRef: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}): number {
  const { providerLabel, modelRef } = params;
  let input = Math.max(0, params.inputTokens);
  let output = Math.max(0, params.outputTokens);
  const total = Math.max(0, params.totalTokens);

  if (input === 0 && output === 0 && total > 0) {
    input = Math.floor(total / 2);
    output = total - input;
  }

  const { inputPer1M, outputPer1M } = ratesForProviderAndModel(
    providerLabel,
    modelRef,
  );
  return (input / 1_000_000) * inputPer1M + (output / 1_000_000) * outputPer1M;
}
