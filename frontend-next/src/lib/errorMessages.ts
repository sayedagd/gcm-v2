type ErrorPayload = {
  errorAr?: string;
  errorEn?: string;
  messageAr?: string;
  messageEn?: string;
  error?: string;
  message?: string;
};

type ErrorLike = ErrorPayload & {
  response?: {
    data?: ErrorPayload;
  };
};

export const resolveLocalizedError = (
  error: unknown,
  isAr: boolean,
  fallbackAr: string,
  fallbackEn: string,
): string => {
  const err = (error as ErrorLike) || {};
  const payload = err.response?.data || err;

  const preferred = isAr
    ? payload.errorAr || payload.messageAr || payload.errorEn || payload.messageEn || payload.error || payload.message
    : payload.errorEn || payload.messageEn || payload.errorAr || payload.messageAr || payload.error || payload.message;

  return preferred || (isAr ? fallbackAr : fallbackEn);
};
