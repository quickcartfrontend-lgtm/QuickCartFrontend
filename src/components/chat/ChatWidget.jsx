import { useCallback, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ChatPanel from './ChatPanel';
import useChat from './useChat';
import './chat.css';

// If the edge nginx injected the standalone widget script, that widget owns the chat UI:
// never show two chat buttons.
const standaloneWidgetPresent = () =>
  typeof document !== 'undefined' && Boolean(document.querySelector('script[src*="chatbot-widget"]'));

export default function ChatWidget() {
  const { isAuthenticated, user } = useAuth();

  // Guests and admins get nothing (contract: CUSTOMER only).
  if (!isAuthenticated || user?.role !== 'CUSTOMER') return null;
  if (standaloneWidgetPresent()) return null;

  // key = user id: logging out and in as someone else destroys ALL chat state.
  return <ChatLauncher key={user.id} userId={user.id} />;
}

function ChatLauncher({ userId }) {
  const [open, setOpen] = useState(false);
  const chat = useChat(userId);
  const launcherRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus(); // focus goes back to where the user started
  }, []);
  const closeQuietly = useCallback(() => setOpen(false), []); // after following a link, leave focus alone

  return (
    <>
      <ChatPanel chat={chat} open={open} onClose={close} onNavigate={closeQuietly} />
      <button
        ref={launcherRef}
        type="button"
        className="chat-launcher"
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {open ? '×' : '💬'}
      </button>
    </>
  );
}