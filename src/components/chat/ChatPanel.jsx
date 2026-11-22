import { useEffect, useRef, useState } from 'react';
import ErrorBanner from '../ErrorBanner';
import ChatText from './ChatText';
import { MAX_MESSAGE_LENGTH } from './useChat';

const SUGGESTIONS = ['What milk do you have?', 'Where is my latest order?', "What's in my cart?"];

export default function ChatPanel({ chat, open, onClose, onNavigate }) {
  const { messages, busy, error, send, newChat } = chat;
  const [draft, setDraft] = useState('');
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Keep the newest message in view.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  // Focus moves in when the panel opens, and back to the input after each answer.
  useEffect(() => {
    if (open && !busy) inputRef.current?.focus();
  }, [open, busy]);

  const submitDraft = async () => {
    const ok = await send(draft);
    if (ok === true) setDraft(''); // on failure the draft stays, so retrying is one click
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submitDraft();
    }
  };

  return (
    <section
      className="chat-panel"
      role="dialog"
      aria-label="QuickCart assistant"
      hidden={!open}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <header className="chat-panel__header">
        <strong>QuickCart assistant</strong>
        <div className="chat-panel__actions">
          <button type="button" onClick={newChat} disabled={messages.length === 0 && !busy}>
            New chat
          </button>
          <button type="button" onClick={onClose} aria-label="Close chat">×</button>
        </div>
      </header>

      <div className="chat-log" ref={listRef} role="log" aria-live="polite" aria-relevant="additions">
        {messages.length === 0 && !busy && (
          <div className="chat-empty">
            <p>Hi! I can help you find products, check your cart and track your orders.</p>
            <div className="chat-chips">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} disabled={busy}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`chat-msg chat-msg--${m.role}`}>
            {m.role === 'assistant' ? <ChatText text={m.text} onNavigate={onNavigate} /> : m.text}
          </div>
        ))}

        {busy && (
          <div className="chat-typing" role="status">
            <span className="chat-sr-only">The assistant is typing</span>
            <i /><i /><i />
          </div>
        )}
      </div>

      <ErrorBanner message={error} />

      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          submitDraft();
        }}
      >
        <label htmlFor="chat-input" className="chat-sr-only">Your message</label>
        <textarea
          id="chat-input"
          ref={inputRef}
          rows={2}
          maxLength={MAX_MESSAGE_LENGTH}
          value={draft}
          disabled={busy}
          placeholder="Ask about products, your cart or orders"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="chat-form__row">
          <span className="chat-counter">{draft.length}/{MAX_MESSAGE_LENGTH}</span>
          <button type="submit" disabled={busy || !draft.trim()}>Send</button>
        </div>
      </form>

      <p className="chat-note">
        I can only look things up. To change your cart or place an order, use the Cart or Checkout page.
      </p>
    </section>
  );
}