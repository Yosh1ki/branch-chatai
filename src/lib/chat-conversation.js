export function groupConversationPairs(messages) {
  const pairs = [];
  let current = null;

  for (const message of messages) {
    if (message.role === "user") {
      if (current) {
        pairs.push(current);
      }
      current = { user: message, assistant: null };
      continue;
    }

    if (message.role === "assistant") {
      if (!current) {
        pairs.push({ user: null, assistant: message });
      } else {
        current.assistant = message;
        pairs.push(current);
        current = null;
      }
    }
  }

  if (current) {
    pairs.push(current);
  }

  return pairs;
}
