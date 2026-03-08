const CHAT_TIMING_LOG_LABEL = "[chat-timing]";

const now = () =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

const roundDuration = (value: number) => Math.round(value * 100) / 100;

const normalizeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      errorMessage: error.message,
      errorName: error.name,
    };
  }

  return {
    errorMessage: String(error),
    errorName: "UnknownError",
  };
};

export const isChatTimingEnabled = () => process.env.ENABLE_CHAT_TIMING_LOGS === "true";

type TimingContext = Record<string, unknown>;

type MeasureOptions<T> = {
  onError?: (error: unknown) => TimingContext;
  onSuccess?: (result: T) => TimingContext;
};

export const logChatTiming = (event: string, context: TimingContext = {}) => {
  if (!isChatTimingEnabled()) {
    return;
  }

  console.info(CHAT_TIMING_LOG_LABEL, {
    event,
    ...context,
  });
};

export const measureChatTiming = async <T>(
  event: string,
  context: TimingContext,
  run: () => Promise<T>,
  options: MeasureOptions<T> = {}
): Promise<T> => {
  const startedAt = now();

  try {
    const result = await run();
    logChatTiming(event, {
      ...context,
      durationMs: roundDuration(now() - startedAt),
      ...(options.onSuccess ? options.onSuccess(result) : {}),
    });
    return result;
  } catch (error) {
    logChatTiming(event, {
      ...context,
      durationMs: roundDuration(now() - startedAt),
      ...normalizeError(error),
      ...(options.onError ? options.onError(error) : {}),
    });
    throw error;
  }
};
