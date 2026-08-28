// Ported from legacy/config/sidebar.php. `path` drives react-router nav.
export const sidebarConfig = {
  mainSections: [
    {
      key: "dashboard",
      label: "Dashboard",
      items: [
        { tab: "overview", path: "/", title: "Overview", label: "Overview", icon: "🏠" },
        { tab: "allProjects", path: "/projects", title: "All Projects", label: "All Projects", icon: "📦" },
        {
          tab: "allChats",
          path: "/chats",
          title: "All Chats",
          label: "All Chats",
          icon: "💬",
          hiddenForGuest: true,
        },
      ],
    },
    {
      key: "tools",
      label: "Tools",
      items: [
        { tab: "devTracker", path: "/dev-tracker", title: "Dev Tracker", label: "Dev Tracker", icon: "💻" },
        { tab: "passwordManager", path: "/password-manager", title: "Password Manager", label: "Password Manager", icon: "🔑" },
        { tab: "fileBridge", path: "/finder", title: "File Bridge", label: "File Bridge", icon: "📁" },
      ],
    },
  ],
};
