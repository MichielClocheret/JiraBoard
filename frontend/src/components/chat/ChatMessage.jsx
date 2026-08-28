import { useState } from "react";
import { useOnlineFinder } from "../../features/finder/OnlineFinderContext";
import { formatTimestamp, parsePayload, resolveDisplayName, splitMentions, summarize } from "../../lib/chatFormat";

function MentionText({ text, mentionUsers }) {
  const segments = splitMentions(text, mentionUsers);
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === "mention" ? (
          <span key={i} className="chat-mention-mark">
            {seg.value}
          </span>
        ) : (
          <span key={i}>{seg.value}</span>
        )
      )}
    </>
  );
}

// Ported from chatCreateMessageRow()/chatCreateMessageBody() in
// legacy/features/chat/chat.js.
export default function ChatMessage({ message, isOwn, availableUsers, mentionUsers, focused, onReply, onDelete, onJumpToMessage }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { openFileAction } = useOnlineFinder();
  const isDeleted = Boolean(message.deleted);
  const parsed = parsePayload(message.message);

  return (
    <div
      className={`chat-message ${isOwn ? "chat-message--self" : ""} ${isDeleted ? "chat-message--deleted" : ""} ${menuOpen ? "chat-message--menu-open" : ""} ${focused ? "chat-message--mention-focus" : ""}`}
      data-message-id={message.id}
    >
      <div className="chat-message__meta">
        <span>{resolveDisplayName(message.displayName, availableUsers)}</span>
        <span>{formatTimestamp(message.createdAt)}</span>
      </div>

      {message.reply && Number(message.reply.id || 0) > 0 && (
        <button type="button" className="chat-message__reply-ref" onClick={() => onJumpToMessage(message.reply.id)}>
          <span className="chat-message__reply-ref-name">{resolveDisplayName(message.reply.displayName, availableUsers)}</span>
          <span className="chat-message__reply-ref-text">{summarize(message.reply.message || "")}</span>
        </button>
      )}

      <div className="chat-message__content-row">
        <div className={`chat-message__body ${isDeleted ? "chat-message__body--deleted" : ""}`}>
          {isDeleted ? (
            <div className="chat-message__text">Message deleted</div>
          ) : (
            <>
              {parsed.text.trim() && (
                <div className="chat-message__text">
                  <MentionText text={parsed.text} mentionUsers={mentionUsers} />
                </div>
              )}
              {parsed.files.length > 0 && (
                <div className="chat-message__attachments">
                  {parsed.files.map((file) => (
                    <button key={file.path} type="button" className="chat-message__attachment" onClick={() => openFileAction(file)}>
                      📎 {file.name || file.path}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {!isDeleted && (
          <div className="chat-message__menu">
            <button
              type="button"
              className="chat-message__menu-toggle"
              aria-label="Message actions"
              aria-expanded={menuOpen}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((o) => !o);
              }}
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="chat-message__menu-list">
                <button
                  type="button"
                  className="chat-message__menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onReply(message);
                  }}
                >
                  Reply
                </button>
                {isOwn && (
                  <button
                    type="button"
                    className="chat-message__menu-item chat-message__menu-item--danger"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(message.id);
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
