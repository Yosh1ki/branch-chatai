export const buildParentChain = (messages, parentMessageId) => {
  if (!parentMessageId) {
    return [];
  }

  const messageById = new Map(messages.map((message) => [message.id, message]));
  const chain = [];
  let currentId = parentMessageId;

  while (currentId) {
    const current = messageById.get(currentId);
    if (!current) {
      break;
    }
    chain.unshift({
      id: current.id,
      role: current.role,
      content: current.content,
      parentMessageId: current.parentMessageId,
    });
    currentId = current.parentMessageId ?? null;
  }

  return chain;
};
