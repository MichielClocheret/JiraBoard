import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchProjectManagers, fetchUsers } from "../api/jira";
import { login as apiLogin, logout as apiLogout, whoami as apiWhoami } from "../api/auth";
import { fetchSetupStatus } from "../api/setup";

// Replaces window.appState + the login/session parts of legacy/js/login.js
// and legacy/js/sideDashboard.js.
const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [availableUsers, setAvailableUsers] = useState([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [projectManagers, setProjectManagers] = useState([]);
  const [authUser, setAuthUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [setupDefaults, setSetupDefaults] = useState(null);
  // 'loading' | 'needsSetup' | 'loggedOut' | 'authed'
  const [sessionStatus, setSessionStatus] = useState("loading");

  const loadProjectManagers = useCallback(async () => {
    try {
      const data = await fetchProjectManagers();
      setProjectManagers(data?.ok && Array.isArray(data.managers) ? data.managers : []);
    } catch {
      setProjectManagers([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Check first-run setup before anything else — a fetch/parse failure
      // here is treated as "assume configured" so a transient hiccup never
      // permanently traps an already-working install on this screen.
      const setupStatus = await fetchSetupStatus().catch(() => null);
      if (cancelled) return;
      if (setupStatus?.ok && setupStatus.configured === false) {
        setSetupDefaults(setupStatus.defaults || null);
        setSessionStatus("needsSetup");
        return;
      }

      const [usersData, whoamiData] = await Promise.all([
        fetchUsers().catch(() => null),
        apiWhoami().catch(() => null),
      ]);
      if (cancelled) return;

      let users = [];
      if (usersData?.ok && Array.isArray(usersData.users) && usersData.users.length) {
        users = usersData.users;
        setAvailableUsers(users);
        setUsersLoaded(true);
      } else {
        setUsersError(usersData?.error || "No users returned by Jira.");
      }

      if (whoamiData?.success && whoamiData.user) {
        const jiraAccountId = whoamiData.user.jiraAccountId;
        let matched = jiraAccountId ? users.find((u) => u.accountId === jiraAccountId) : null;
        if (!matched) {
          matched = {
            accountId: jiraAccountId || "",
            displayName: whoamiData.user.displayName || "Unknown",
            avatarUrls: {},
          };
        }
        setAuthUser(matched);
        setIsGuest(false);
        setSessionStatus("authed");
        loadProjectManagers();
      } else {
        setSessionStatus("loggedOut");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadProjectManagers]);

  const loginWithPassword = useCallback(
    async (user, password) => {
      const data = await apiLogin(password, user.accountId || "", user.displayName || "");
      if (!data?.success) throw new Error(data?.message || "Unable to sign in.");
      setAuthUser(user);
      setIsGuest(false);
      setSessionStatus("authed");
      loadProjectManagers();
    },
    [loadProjectManagers]
  );

  const continueAsGuest = useCallback(() => {
    setAuthUser(null);
    setIsGuest(true);
    setSessionStatus("authed");
    loadProjectManagers();
  }, [loadProjectManagers]);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      /* ignore */
    }
    setAuthUser(null);
    setIsGuest(false);
    setSessionStatus("loggedOut");
  }, []);

  // Resolve a "user-like" object (accountId/displayName/avatarUrls) for the
  // /user/:accountId/* routes — the same account can be reached via the
  // Team Members list, the Project Managers list, or by being the signed-in
  // user, so all three sources are considered.
  const resolveUser = useCallback(
    (accountId) => {
      return (
        availableUsers.find((u) => u.accountId === accountId) ||
        projectManagers.find((u) => u.accountId === accountId) ||
        (authUser && authUser.accountId === accountId ? authUser : null) ||
        { accountId, displayName: "Unknown", avatarUrls: {} }
      );
    },
    [availableUsers, projectManagers, authUser]
  );

  const value = useMemo(
    () => ({
      availableUsers,
      usersLoaded,
      usersError,
      projectManagers,
      authUser,
      isGuest,
      sessionStatus,
      setupDefaults,
      resolveUser,
      loginWithPassword,
      continueAsGuest,
      signOut,
    }),
    [availableUsers, usersLoaded, usersError, projectManagers, authUser, isGuest, sessionStatus, setupDefaults, resolveUser, loginWithPassword, continueAsGuest, signOut]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
