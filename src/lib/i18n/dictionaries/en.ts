import type { JaDictionary } from "./ja.ts"

export const enDictionary: { [K in keyof JaDictionary]: string } = {
  "login.aboutBranch": "About Branch",
  "login.mechanism": "How it works",
  "login.howToUse": "How to use",
  "login.features": "Features",
  "login.pricing": "Pricing",
  "login.free": "Free",
  "login.tryBranch": "Try Branch",
  "login.headline": "Keep thinking without interruption",
  "login.subline1": "From one topic, Branch helps you",
  "login.subline2": "grow multiple lines of thought.",

  "settings.backToChats": "Back to chats",
  "settings.title": "Settings",
  "settings.accountTitle": "Account",
  "settings.accountDescription": "View your account information.",
  "settings.name": "Name",
  "settings.email": "Email",
  "settings.unset": "Not set",
  "settings.planTitle": "Plan and usage",
  "settings.planDescription": "Your current plan and today's message usage.",
  "settings.currentPlan": "Current plan",
  "settings.todayMessages": "Messages today",
  "settings.dailyReset": "Resets daily at {{resetTime}} ({{timeZone}}).",
  "settings.themeTitle": "Theme",
  "settings.themeDescription": "Switch between light and dark. Your choice is kept for future sign-ins.",
  "settings.languageTitle": "Language",
  "settings.languageDescription": "Switch the app display language.",
  "settings.close": "Close settings",

  "billing.upgrade": "Upgrade",
  "billing.upgrading": "Opening...",
  "billing.upgradeFailed": "Failed to open the upgrade page. Please try again later.",

  "account.guest": "Guest",
  "account.settings": "Settings",
  "account.logout": "Log out",

  "chats.recent": "Recent chats",
  "chats.showMore": "Show more",
  "chats.updatedAtUnknown": "Updated date unavailable",
  "chats.deleteFailed": "Failed to delete the chat. Please try again later.",
  "chats.deleteAction": "Delete",
  "chats.deleteConfirmTitle": "Delete this chat?",
  "chats.deleteConfirmDescription": "This action cannot be undone.",
  "chats.cancel": "Cancel",
  "chats.deleting": "Deleting...",
  "chats.delete": "Delete",
  "chats.dailyLimitReached":
    "You have reached the free plan daily limit ({{limit}}). Please try again tomorrow.",

  "sort.label": "Sort order",
  "sort.newest": "Newest first",
  "sort.oldest": "Oldest first",

  "prompt.tagline1": "You don't want to stop thinking, right?",
  "prompt.tagline2": "Branch out your current insight.",
  "prompt.tagline3": "The broader the topic, the better the structure.",
  "prompt.tagline4": "Capture that branching point right now.",
  "prompt.tagline5": "Let's expand your map of ideas together.",
  "prompt.placeholder": "Ask anything",
  "prompt.modelHint.gpt52":
    "Reliable, high-quality responses for a wide range of everyday and professional tasks.",
  "prompt.modelHint.gpt52Thinking":
    "Uses deeper reasoning for careful answers, suited to complex problems and planning.",
  "prompt.modelHint.claudeOpus45":
    "Strong long-context understanding and precise analysis for heavier thinking tasks.",
  "prompt.modelHint.claudeSonnet45":
    "Balanced speed and quality, great for research, summaries, and writing workflows.",
  "prompt.modelHint.gemini25Pro":
    "High reasoning capability with broad context handling for advanced problem-solving.",
  "prompt.modelHint.gemini25Flash":
    "Fast lightweight model optimized for quick iterations and responsive conversations.",

  "chat.sendFailed": "Failed to send your message.",
  "chat.loadFailed": "Failed to load data.",
  "chat.branchList": "Branch list",
  "chat.newBranch": "New branch",

  "assistant.organizeInfo": "Organize information",
  "assistant.buildAnswer": "Draft answer",
  "assistant.searchWeb": "Searching the web",
  "assistant.thinking": "Thinking... {{seconds}}s",
  "assistant.viewResearchNotes": "View research notes",
  "assistant.researchNotes": "Research notes",
  "assistant.thinkingTime": "Thinking time: {{seconds}}",
  "assistant.measuring": "measuring",
  "assistant.noResearchInfo": "No research details are available.",
  "assistant.errorPrefix": "Error",
  "assistant.generating": "Generating...",
  "assistant.loadingAnswer": "Loading response...",
  "assistant.noAnswerYet": "No response yet.",
  "assistant.regenerate": "Regenerate",
  "assistant.share": "Share",
  "assistant.delete": "Delete",

  "user.loading": "Loading...",
  "user.errorPrefix": "Error",
  "user.noMessageYet": "No message yet.",

  "theme.light": "Light",
  "theme.dark": "Dark",
  "language.ja": "Japanese",
  "language.en": "English",

  "errors.fetchResponseFailed": "Failed to fetch response.",
  "errors.networkFailed": "Network request failed.",
  "errors.themeSaveFailed": "Failed to save theme. Please try again.",
  "errors.localeSaveFailed": "Failed to save language. Please try again.",
  "errors.dailyLimitReached":
    "You have reached the free plan daily limit ({{limit}}). Please try again tomorrow.",

  "richText.fallbackPlainText": "Unable to format content, showing plain text instead.",
}
