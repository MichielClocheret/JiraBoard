import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppState } from "../../state/AppStateContext";
import { usePageHeader } from "../../state/PageHeaderContext";
import { useChatAuth } from "../../features/chat/useChatAuth";
import { useChatProjects } from "../../features/chat/useChatProjects";
import ChatAuthModal from "./ChatAuthModal";
import ProjectListPane from "./ProjectListPane";
import ChatRoom from "./ChatRoom";

// Ported from window.initAllChatsPage() in legacy/features/chat/chat.js —
// the project-key deep link (chatRequestedKey/chatPendingOpenKey dance) is
// now just a route param (/chats/:projectKey), and pinning/refreshing the
// sidebar's pinned list is handled by shared React Query cache invalidation
// instead of a global onPinnedRefresh callback.
export default function ChatPage() {
  usePageHeader("All Chats");
  const { projectKey } = useParams();
  const navigate = useNavigate();
  const { authUser, availableUsers } = useAppState();
  const accountId = authUser?.accountId || "";
  const auth = useChatAuth(accountId);
  const { projects, isLoading, isError } = useChatProjects();

  const mentionUsers = useMemo(() => {
    const raw = (availableUsers || []).map((u) => String(u.displayName || "").trim()).filter(Boolean);
    const dedup = raw.filter((n, i, a) => a.findIndex((x) => x.toLowerCase() === n.toLowerCase()) === i);
    return dedup.sort((a, b) => a.localeCompare(b));
  }, [availableUsers]);

  const normalizedKey = projectKey ? projectKey.toUpperCase() : "";
  const selected = normalizedKey ? projects.find((p) => p.key === normalizedKey) : null;

  useEffect(() => {
    if (normalizedKey && !isLoading && !isError && !selected) {
      navigate("/chats", { replace: true });
    }
  }, [normalizedKey, isLoading, isError, selected, navigate]);

  if (auth.status === "checking") return <p className="spinner-text">Loading chat…</p>;

  if (auth.status === "needsLogin") {
    return <ChatAuthModal accountId={accountId} displayName={authUser?.displayName || ""} onLogin={auth.login} />;
  }

  return (
    <div className={`all-chats-layout ${selected ? "chat-only" : "projects-only"}`}>
      {selected ? (
        <div className="all-chats-chat-pane">
          <ChatRoom
            projectKey={selected.key}
            projectName={selected.name}
            currentUserId={auth.currentUserId}
            availableUsers={availableUsers}
            mentionUsers={mentionUsers}
            onBack={() => navigate("/chats")}
          />
        </div>
      ) : (
        <ProjectListPane
          projects={projects}
          isLoading={isLoading}
          isError={isError}
          onOpen={(key) => navigate(`/chats/${key}`)}
        />
      )}
    </div>
  );
}
