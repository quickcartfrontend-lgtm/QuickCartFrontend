import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { deleteConversation, sendChatMessage } from '../../api/chatApi';
import useSubmitLock from '../../utils/useSubmitLock';
import { describeChatError } from './chatErrors';

export const MAX_MESSAGE_LENGTH = 500;

const storageKey = (userId) => `quickcartchat.cid.${userId}`;

function readStored(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStored(key, value) {
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch {
    /* storage blocked: chat still works, it just forgets its conversation on reload */
  }
}

export default function useChat(userId) {
  const key = storageKey(userId);
  const [messages, setMessages] = useState([]); // { id, role: 'user' | 'assistant', text }
  const [conversationId, setConversationId] = useState(() => readStored(key));
  const [error, setError] = useState('');
  const { busy, run } = useSubmitLock(); // one request at a time (Mandate 5)
  const abortRef = useRef(null);
  const idRef = useRef(0);

  // Leaving (logout, user switch) cancels a request still in flight.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Resolves true when the reply arrived, false otherwise (so the caller keeps the draft for a retry).
  const send = useCallback(
    (raw) =>
      run(async () => {
        const text = raw.trim();
        if (!text || text.length > MAX_MESSAGE_LENGTH) return false;

        const userMessageId = ++idRef.current;
        setError('');
        setMessages((prev) => [...prev, { id: userMessageId, role: 'user', text }]);

        const controller = new AbortController();
        abortRef.current = controller;
        try {
          const reply = await sendChatMessage({ conversationId, message: text }, controller.signal);
          const replyId = ++idRef.current;
          setConversationId(reply.conversationId); // the server may start a fresh conversation
          writeStored(key, reply.conversationId);
          setMessages((prev) => [...prev, { id: replyId, role: 'assistant', text: String(reply.reply ?? '') }]);
          return true;
        } catch (err) {
          setMessages((prev) => prev.filter((m) => m.id !== userMessageId)); // draft stays in the input
          if (!axios.isCancel(err)) setError(describeChatError(err));
          return false;
        } finally {
          abortRef.current = null;
        }
      }),
    [run, conversationId, key]
  );

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    const previous = conversationId;
    setMessages([]);
    setConversationId(null);
    setError('');
    writeStored(key, null);
    if (previous) deleteConversation(previous).catch(() => {}); // idempotent; a failure changes nothing for the user
  }, [conversationId, key]);

  return { messages, busy, error, send, newChat };
}