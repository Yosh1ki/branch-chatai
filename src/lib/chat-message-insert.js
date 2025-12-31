export function insertAfterMessage(messages, targetId, additions) {
  if (!Array.isArray(messages)) {
    return Array.isArray(additions) ? [...additions] : [];
  }

  const list = Array.isArray(additions) ? additions : [];
  const index = messages.findIndex((message) => message.id === targetId);
  if (index === -1) {
    return [...messages, ...list];
  }

  return [...messages.slice(0, index + 1), ...list, ...messages.slice(index + 1)];
}
