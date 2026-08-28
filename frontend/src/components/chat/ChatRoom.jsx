import { useCallback, useEffect, useRef, useState } from "react";
import { deleteMessage, fetchMessages, sendMessage } from "../../api/chat";
import { buildOutgoingMessage, resolveDisplayName, summarize } from "../../lib/chatFormat";
import ChatMessage from "./ChatMessage";
import ComposeBar from "./ComposeBar";

const POLL_MS = 7000;

// Ported from chatOpenProject()/chatLoadMessages()/chatStartPolling() etc.
// in legacy/features/chat/chat.js.
export default function ChatRoom({ projectKey, projectName, currentUserId, availableUsers, mentionUsers, onBack }) {
  const [messages, setMessages] = useState([]);
  const [feedback, setFeedback] = useState(null); // { type, message } | null
  const [replyTarget, setReplyTarget] = useState(null); // { id, displayName, message } | null
  const [focusedId, setFocusedId] = useState(null);
  const messagesRef = useRef(null);
  const lastIdRef = useRef(0);

  const isAtBottom = () => {
    const el = messagesRef.current;
    if (!el) return true;
    return el.scrollHeight - (el.scrollTop + el.clientHeight) <= 50;
  };

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    });
  };

  const loadMessages = useCallback(
    async (scrollMode, incremental) => {
      if (!projectKey) return;
      try {
        const data = await fetchMessages(projectKey, incremental ? lastIdRef.current : 0);
        if (!data?.success) throw new Error(data?.message || "Unable to load messages.");
        const incoming = data.messages || [];

        if (incremental) {
          const fresh = incoming.filter((m) => Number(m?.id || 0) > lastIdRef.current);
          if (!fresh.length) return;
          const wasBottom = isAtBottom();
          setMessages((prev) => [...prev, ...fresh]);
          fresh.forEach((m) => { lastIdRef.current = Math.max(lastIdRef.current, Number(m.id || 0)); });
          if (scrollMode === "force" || (scrollMode === "smart" && wasBottom)) scrollToBottom();
        } else {
          lastIdRef.current = 0;
          incoming.forEach((m) => { lastIdRef.current = Math.max(lastIdRef.current, Number(m.id || 0)); });
          setMessages(incoming);
          if (scrollMode === "force") scrollToBottom();
        }
        setFeedback(null);
      } catch (err) {
        setFeedback({ type: "error", message: err.message || "Unable to load messages." });
      }
    },
    [projectKey]
  );

  useEffect(() => {
    setMessages([]);
    lastIdRef.current = 0;
    setReplyTarget(null);
    setFeedback(null);
    loadMessages("force", false);
    const timer = setInterval(() => loadMessages("smart", true), POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectKey]);

  const handleReply = (message) => {
    setReplyTarget({
      id: Number(message.id || 0),
      displayName: resolveDisplayName(message.displayName, availableUsers),
      message: summarize(message.message || ""),
    });
  };

  const handleJumpToMessage = (id) => {
    setFocusedId(id);
    const target = messagesRef.current?.querySelector(`[data-message-id="${CSS.escape(String(id))}"]`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setFocusedId(null), 1800);
  };

  const handleDelete = async (messageId) => {
    try {
      const data = await deleteMessage(messageId);
      if (!data?.success) throw new Error(data?.message || "Unable to delete message.");
      if (replyTarget && Number(replyTarget.id) === Number(messageId)) setReplyTarget(null);
      setFeedback({ type: "success", message: "Message deleted." });
      loadMessages("smart", false);
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Unable to delete message." });
    }
  };

  const handleSend = async (rawText, pendingFiles) => {
    const message = buildOutgoingMessage(rawText, pendingFiles);
    try {
      const data = await sendMessage(projectKey, message, replyTarget?.id);
      if (!data?.success) throw new Error(data?.message || "Unable to send message.");
      setReplyTarget(null);
      setFeedback(null);
      loadMessages("force", false);
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Unable to send message." });
    }
  };

  return (
    <div className="chat-room-view" id="all-chats-chat-room">
      <div className="chat-room-header">
        <button type="button" className="chat-room-header__back" aria-label="Back to projects" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="chat-room-header__title">{projectName || projectKey}</div>
      </div>

      {feedback && <div className={`chat-feedback ${feedback.type}`}>{feedback.message}</div>}

      <div className="chat-messages" id="all-chats-chat-messages" ref={messagesRef} role="log" aria-live="polite" aria-label="Chat messages">
        {!messages.length ? (
          <div className="issue-empty">No messages yet.</div>
        ) : (
          messages.map((m) => (
            <ChatMessage
              key={m.id}
              message={m}
              isOwn={currentUserId != null && Number(m.userId || 0) > 0 && Number(m.userId) === currentUserId}
              availableUsers={availableUsers}
              mentionUsers={mentionUsers}
              focused={focusedId === m.id}
              onReply={handleReply}
              onDelete={handleDelete}
              onJumpToMessage={handleJumpToMessage}
            />
          ))
        )}
      </div>

      <ComposeBar mentionUsers={mentionUsers} replyTarget={replyTarget} onCancelReply={() => setReplyTarget(null)} onSend={handleSend} />
    </div>
  );
}
