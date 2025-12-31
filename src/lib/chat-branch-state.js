export function createBranchDraftState() {
  return {
    active: null,
    text: "",
  };
}

export function branchDraftReducer(state, action) {
  switch (action.type) {
    case "open-branch":
      return {
        active: {
          parentMessageId: action.parentMessageId,
          side: action.side,
        },
        text: "",
      };
    case "set-text":
      return {
        ...state,
        text: action.value,
      };
    case "close-branch":
      return {
        active: null,
        text: "",
      };
    default:
      return state;
  }
}
