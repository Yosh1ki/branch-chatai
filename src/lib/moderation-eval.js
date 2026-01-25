const CRITICAL_CATEGORIES = [
  "sexual/minors",
  "self-harm/intent",
  "self-harm/instructions",
  "violence/graphic",
  "illicit/violent",
];

export const evaluateModerationResult = (result, options = {}) => {
  const criticalThreshold = options.criticalThreshold ?? 0.2;
  const defaultThreshold = options.defaultThreshold ?? 0.5;

  if (!result) {
    return { blocked: false, reason: "no_result" };
  }

  if (result.flagged) {
    return { blocked: true, reason: "flagged" };
  }

  const scores = result.category_scores ?? {};
  for (const category of CRITICAL_CATEGORIES) {
    const score = scores[category];
    if (typeof score === "number" && score >= criticalThreshold) {
      return { blocked: true, reason: "critical_threshold", category };
    }
  }

  for (const [category, score] of Object.entries(scores)) {
    if (CRITICAL_CATEGORIES.includes(category)) {
      continue;
    }
    if (typeof score === "number" && score >= defaultThreshold) {
      return { blocked: true, reason: "default_threshold", category };
    }
  }

  return { blocked: false, reason: "ok" };
};
