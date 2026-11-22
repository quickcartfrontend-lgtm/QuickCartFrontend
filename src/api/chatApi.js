import httpClient from './httpClient';

const CHAT_TIMEOUT_MS = 110000; // the server allows the model 90 s; httpClient's default 15 s is too short
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/v1/chat/messages
export async function sendChatMessage({ conversationId, message }, signal) {
  const { data } = await httpClient.post(
    '/api/v1/chat/messages',
    { conversationId, message },
    { timeout: CHAT_TIMEOUT_MS, signal }
  );
  return data; // { conversationId, reply, createdAt }
}

// DELETE /api/v1/chat/conversations/{id}: idempotent, 204 always
export async function deleteConversation(conversationId) {
  if (!UUID_RE.test(String(conversationId))) return; // plain ids only in API paths
  await httpClient.delete(`/api/v1/chat/conversations/${conversationId}`);
}