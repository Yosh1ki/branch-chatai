export function createChatPromptState() {
  return {
    promptText: "",
    userMessage: "",
    assistantMessage: "",
    isSubmitting: false,
    errorMessage: "",
    hasSubmitted: false,
  };
}

export function chatPromptReducer(state, action) {
  switch (action.type) {
    case "set-prompt":
      return {
        ...state,
        promptText: action.value,
      };
    case "submit": {
      const trimmed = state.promptText.trim();
      return {
        ...state,
        promptText: "",
        userMessage: trimmed,
        assistantMessage: "",
        isSubmitting: true,
        errorMessage: "",
        hasSubmitted: true,
      };
    }
    case "receive":
      return {
        ...state,
        userMessage: action.userMessage,
        assistantMessage: action.assistantMessage,
        isSubmitting: false,
        errorMessage: "",
        hasSubmitted: true,
      };
    case "error":
      return {
        ...state,
        isSubmitting: false,
        errorMessage: action.message,
        hasSubmitted: true,
      };
    case "sync-latest":
      if (state.hasSubmitted || state.promptText.trim()) {
        return state;
      }
      return {
        ...state,
        userMessage: action.userMessage,
        assistantMessage: action.assistantMessage,
        isSubmitting: false,
        errorMessage: "",
      };
    default:
      return state;
  }
}
