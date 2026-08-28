import { useMemo, useRef, useState } from "react";
import { useOnlineFinder } from "../../features/finder/OnlineFinderContext";

// Ported from the mention-menu + reply-preview + attachment-preview +
// chat-compose logic in legacy/features/chat/chat.js.
export default function ComposeBar({ mentionUsers, replyTarget, onCancelReply, onSend }) {
  const [text, setText] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const [mentionMatch, setMentionMatch] = useState(null); // { start, end } | null
  const [mentionIndex, setMentionIndex] = useState(0);
  const inputRef = useRef(null);
  const { openFinder } = useOnlineFinder();

  const mentionItems = useMemo(() => {
    if (!mentionMatch) return [];
    const partial = text.slice(mentionMatch.start + 1, mentionMatch.end).trim().toLowerCase();
    return mentionUsers.filter((n) => n.toLowerCase().includes(partial)).slice(0, 8);
  }, [mentionMatch, mentionUsers, text]);

  const updateMentionMatch = (value, caret) => {
    const beforeCaret = value.slice(0, caret);
    const match = beforeCaret.match(/(?:^|\s)@([^\s@]*)$/);
    if (!match) {
      setMentionMatch(null);
      return;
    }
    const partialLen = String(match[1] || "").length;
    setMentionMatch({ start: caret - partialLen - 1, end: caret });
    setMentionIndex(0);
  };

  const chooseMention = (name) => {
    if (!mentionMatch || !inputRef.current) return;
    const before = text.slice(0, mentionMatch.start);
    const after = text.slice(mentionMatch.end);
    const next = before + "@" + name + " " + after;
    setText(next);
    setMentionMatch(null);
    const caret = (before + "@" + name + " ").length;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(caret, caret);
    });
  };

  const handleAttach = async () => {
    const result = await openFinder("file");
    if (!result || !result.files.length) return;
    setPendingFiles((prev) => {
      const seen = new Set(prev.map((f) => f.path));
      const additions = result.files.filter((f) => f.path && !seen.has(f.path));
      return [...prev, ...additions];
    });
    inputRef.current?.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setMentionMatch(null);
    const raw = text.trim();
    if (!raw && !pendingFiles.length) return;
    if (raw.length > 1000) return; // ComposeBar disables send instead — see below
    onSend(raw, pendingFiles);
    setText("");
    setPendingFiles([]);
  };

  const tooLong = text.trim().length > 1000;

  return (
    <form className="chat-compose" onSubmit={handleSubmit} noValidate>
      {replyTarget && (
        <div className="chat-reply-preview">
          <div className="chat-reply-preview__meta">
            Replying to <span>{replyTarget.displayName}</span>
          </div>
          <div className="chat-reply-preview__text">
            {replyTarget.message.length > 140 ? replyTarget.message.slice(0, 140) + "…" : replyTarget.message}
          </div>
          <button type="button" className="chat-reply-preview__cancel" aria-label="Cancel reply" onClick={onCancelReply}>
            ×
          </button>
        </div>
      )}

      {pendingFiles.length > 0 && (
        <div className="chat-attachment-preview">
          <div className="chat-attachment-preview__meta">Attachments</div>
          <div className="chat-attachment-preview__list">
            {pendingFiles.map((file) => (
              <span key={file.path} className="chat-attachment-chip">
                <span className="chat-attachment-chip__name">{file.name || file.path}</span>
                <button
                  type="button"
                  className="chat-attachment-chip__remove"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => setPendingFiles((prev) => prev.filter((f) => f.path !== file.path))}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {mentionMatch && mentionItems.length > 0 && (
        <div className="chats-mention-menu">
          {mentionItems.map((name, idx) => (
            <button
              key={name}
              type="button"
              className="chats-project-item"
              aria-selected={idx === mentionIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                chooseMention(name);
              }}
            >
              <span className="chats-project-name">{name}</span>
            </button>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="text"
        id="all-chats-chat-message-input"
        className="chat-compose__input chat-input"
        placeholder="Type a message and use @Name to tag"
        maxLength={1000}
        autoComplete="off"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          updateMentionMatch(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onClick={(e) => updateMentionMatch(e.target.value, e.target.selectionStart ?? e.target.value.length)}
        onBlur={() => setTimeout(() => setMentionMatch(null), 120)}
        onKeyDown={(e) => {
          if (!mentionMatch || !mentionItems.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setMentionIndex((i) => (i + 1) % mentionItems.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setMentionIndex((i) => (i - 1 + mentionItems.length) % mentionItems.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            chooseMention(mentionItems[mentionIndex] || mentionItems[0]);
          } else if (e.key === "Escape") {
            e.preventDefault();
            setMentionMatch(null);
          }
        }}
      />
      <button type="button" className="chat-compose__upload" aria-label="Attach files from server" onClick={handleAttach}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
      </button>
      <button type="submit" className="chat-compose__send" aria-label="Send message" disabled={tooLong}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </form>
  );
}
