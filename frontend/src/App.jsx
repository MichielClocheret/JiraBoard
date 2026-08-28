import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AppStateProvider, useAppState } from "./state/AppStateContext";
import { PageHeaderProvider } from "./state/PageHeaderContext";
import { TaskModalProvider } from "./state/TaskModalContext";
import { OnlineFinderProvider } from "./features/finder/OnlineFinderContext";
import { clearServerCache } from "./api/jira";
import TaskModal from "./components/shared/TaskModal";
import LoginModal from "./components/login/LoginModal";
import SetupWizardPage from "./components/setup/SetupWizardPage";
import DashboardLayout from "./components/layout/DashboardLayout";
import OverviewPage from "./components/overview/OverviewPage";
import AllProjectsPage from "./components/projects/AllProjectsPage";
import UserRoute from "./components/user/UserRoute";
import FileBridgePage from "./components/finder/FileBridgePage";
import PasswordManagerPage from "./components/password/PasswordManagerPage";
import ChatPage from "./components/chat/ChatPage";
import DevTrackerPage from "./components/dev/DevTrackerPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

function RootRoutes() {
  const { sessionStatus, authUser, isGuest, setupDefaults } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();

  // Ported from openDashboard() in legacy/js/sideDashboard.js: a signed-in
  // user lands on their own Todos, a guest lands on the main Overview tab.
  useEffect(() => {
    if (sessionStatus !== "authed") return;
    if (location.pathname !== "/") return; // don't hijack a deep link
    if (authUser && !isGuest) {
      navigate(`/user/${encodeURIComponent(authUser.accountId)}/todos`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus]);

  if (sessionStatus === "loading") return null;
  if (sessionStatus === "needsSetup") return <SetupWizardPage defaults={setupDefaults} />;
  if (sessionStatus === "loggedOut") return <LoginModal />;

  return (
    <>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="projects" element={<AllProjectsPage />} />
          <Route path="chats" element={<ChatPage />} />
          <Route path="chats/:projectKey" element={<ChatPage />} />
          <Route path="dev-tracker" element={<DevTrackerPage />} />
          <Route path="dev-tracker/:projectName" element={<DevTrackerPage />} />
          <Route path="password-manager" element={<PasswordManagerPage />} />
          <Route path="finder" element={<FileBridgePage />} />
          <Route path="user/:accountId/:tab" element={<UserRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <TaskModal />
    </>
  );
}

export default function App() {
  useEffect(() => {
    // Bust the server-side Jira cache once per page load, same as the
    // original app (see legacy/js/userDashboard.js).
    clearServerCache().catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppStateProvider>
        <BrowserRouter>
          <PageHeaderProvider>
            <TaskModalProvider>
              <OnlineFinderProvider>
                <RootRoutes />
              </OnlineFinderProvider>
            </TaskModalProvider>
          </PageHeaderProvider>
        </BrowserRouter>
      </AppStateProvider>
    </QueryClientProvider>
  );
}
