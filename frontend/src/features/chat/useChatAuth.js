import { useCallback, useEffect, useState } from "react";
import { chatLogin, chatWhoami } from "../../api/chat";

// Ported from chatBootstrapAuth()/the chat-auth-form submit handler in
// legacy/features/chat/chat.js. This is a second, defensive auth check on
// top of the app-wide login (both ultimately hit the same session cookie
// via chat.php) — it only actually prompts if that session has gone stale.
export function useChatAuth(accountId) {
  const [status, setStatus] = useState("checking"); // 'checking' | 'authed' | 'needsLogin'
  const [currentUserId, setCurrentUserId] = useState(null);
  const [error, setError] = useState("");

  // Initial status is already 'checking' (see useState above); this only
  // ever runs once on mount, so there's no need to reset it here.
  const check = useCallback(async () => {
    try {
      const data = await chatWhoami();
      if (!data?.success) throw new Error(data?.message || "Unable to validate chat session.");
      const user = data?.user || null;
      if (user && Number(user.id || 0) > 0) {
        setCurrentUserId(Number(user.id));
        setStatus("authed");
      } else {
        setStatus("needsLogin");
      }
    } catch (err) {
      setError(err.message || "Unable to validate chat session.");
      setStatus("needsLogin");
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const login = useCallback(
    async (password) => {
      if (!accountId) throw new Error("Select a user first before signing in.");
      if (String(password || "").trim().length < 6) throw new Error("Enter a password with at least 6 characters.");
      const data = await chatLogin(password, accountId);
      if (!data?.success) throw new Error(data?.message || "Unable to sign in.");
      setCurrentUserId(Number(data?.user?.id || 0) || null);
      setStatus("authed");
    },
    [accountId]
  );

  return { status, currentUserId, error, login };
}
