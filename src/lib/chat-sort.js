const SORT_ORDERS = ["newest", "oldest"]

const normalizeSortOrder = (value) => {
  if (SORT_ORDERS.includes(value)) {
    return value
  }
  return "newest"
}

const parseTimestamp = (value) => {
  if (!value) {
    return null
  }
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

const sortChatsByUpdatedAt = (chats, order) => {
  const normalizedOrder = normalizeSortOrder(order)

  return [...chats].sort((a, b) => {
    const aTime = parseTimestamp(a.updatedAt)
    const bTime = parseTimestamp(b.updatedAt)

    if (aTime === null && bTime === null) {
      return 0
    }
    if (aTime === null) {
      return 1
    }
    if (bTime === null) {
      return -1
    }

    return normalizedOrder === "newest" ? bTime - aTime : aTime - bTime
  })
}

export { SORT_ORDERS, normalizeSortOrder, sortChatsByUpdatedAt }
