import { parseApiError } from '../../utils/errorMessage';

// Builds on parseApiError (Mandate 2) and adds the chat-specific cases.
export function describeChatError(err) {
  if (err?.code === 'ECONNABORTED' || err?.code === 'ETIMEDOUT') {
    return 'The assistant took too long to answer. Please try again.';
  }
  const { code, message } = parseApiError(err);

  if (code === 'RATE_LIMITED') {
    const wait = Number.parseInt(err?.response?.headers?.['retry-after'], 10);
    return Number.isFinite(wait) && wait > 0
      ? `You are sending messages too quickly. Try again in ${wait} second${wait === 1 ? '' : 's'}.`
      : 'You are sending messages too quickly. Please wait a moment and try again.';
  }
  if (code === 'UNAUTHORIZED') return 'Please log in again.';
  return message; // 400 / 503 / network: the server's (or parseApiError's) message is already user-safe
}