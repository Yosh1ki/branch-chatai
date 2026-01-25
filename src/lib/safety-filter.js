const DEFAULT_HARD_RULES = [
  "(?i)(kill yourself|suicide|self harm|bomb making|how to make explosives)",
  "(?i)(cp|child porn|underage|lolita)",
  "(?i)(nigger|faggot|kike|chink)",
  "(?i)(porn|xxx|nude|onlyfans|sex chat)",
];

const DEFAULT_CATEGORY_RULES = [
  "(?i)(suicide|cut myself|overdose|die)",
  "(?i)(hack|phish|carding|drugs|meth|cocaine|darkweb)",
];

const SPAM_KEYWORDS = ["free money", "crypto scam", "investment return"];

const compileRules = (rules) =>
  rules.map((rule) => {
    const hasIgnoreCase = rule.startsWith("(?i)")
    const pattern = hasIgnoreCase ? rule.replace("(?i)", "") : rule
    return new RegExp(pattern, hasIgnoreCase ? "i" : undefined)
  });

const getConfiguredHardRules = () => {
  const raw = process.env.MODERATION_FAST_GATE_RULES_JSON;
  if (!raw) {
    return DEFAULT_HARD_RULES;
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === "string")) {
      return parsed;
    }
  } catch {
    return DEFAULT_HARD_RULES;
  }
  return DEFAULT_HARD_RULES;
};

const countUrls = (text) => {
  if (!text) return 0;
  const matches = text.match(/https?:\/\/\S+/gi);
  return matches ? matches.length : 0;
};

export const evaluateFastGate = (text) => {
  if (!text) {
    return { blocked: false, reason: "empty" };
  }

  const hardRules = compileRules(getConfiguredHardRules());
  for (const rule of hardRules) {
    if (rule.test(text)) {
      return { blocked: true, reason: "fast_gate_hard", rule: rule.source };
    }
  }

  const categoryRules = compileRules(DEFAULT_CATEGORY_RULES);
  for (const rule of categoryRules) {
    if (rule.test(text)) {
      return { blocked: true, reason: "fast_gate_category", rule: rule.source };
    }
  }

  const urlCount = countUrls(text);
  if (urlCount >= 2) {
    const lower = text.toLowerCase();
    if (SPAM_KEYWORDS.some((keyword) => lower.includes(keyword))) {
      return { blocked: true, reason: "fast_gate_spam" };
    }
  }

  return { blocked: false, reason: "ok" };
};
