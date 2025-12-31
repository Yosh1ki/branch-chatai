export const FREE_PLAN_DAILY_LIMIT = 10

export const getStartOfToday = () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}
