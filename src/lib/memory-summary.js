const DEFAULT_SUMMARY = {
  summary: "",
  key_facts: [],
  user_goal: "",
  action_items: [],
  sentiment: "neutral",
  entities: [],
  last_updated: "",
  turn_count: 0,
};

const extractJsonBlock = (text) => {
  if (!text) return "";
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    return fenced[1];
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return "";
  }
  return text.slice(start, end + 1);
};

export const parseMemorySummary = (text) => {
  const jsonBlock = extractJsonBlock(text);
  if (!jsonBlock) {
    return { ...DEFAULT_SUMMARY };
  }
  try {
    const parsed = JSON.parse(jsonBlock);
    return { ...DEFAULT_SUMMARY, ...parsed };
  } catch {
    return { ...DEFAULT_SUMMARY };
  }
};

export const buildMemorySummaryPrompt = (input, turnCount) => {
  return [
    "Summarize the conversation memory as JSON with this schema:",
    JSON.stringify({
      summary: "2-4 sentences",
      key_facts: ["fact"],
      user_goal: "goal",
      action_items: ["item"],
      sentiment: "positive | neutral | negative | mixed",
      entities: ["entity"],
      last_updated: "ISO-8601 timestamp",
      turn_count: turnCount,
    }),
    "Conversation:",
    input,
  ].join("\n");
};
