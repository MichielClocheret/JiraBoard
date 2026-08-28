import { createContext, useCallback, useContext, useRef, useState } from "react";
import OnlineFinderModal from "./OnlineFinderModal";
import FileActionModal from "./FileActionModal";
import InstallPromptModal from "./InstallPromptModal";
import { checkFinderApp, openViaFinderApp } from "./nativeApp";

// Replaces the global window.openOnlineFinder / window.openFileBridgePath /
// window.openFinderFileAction API + the onlineFinder:filesUploaded
// CustomEvent from legacy/features/finder/finder.js with a promise-based
// context: `await openFinder('file' | 'folder')` resolves with the
// selection (or null if the picker was dismissed) instead of firing a
// global event that whichever feature happened to be listening had to
// interpret.
const OnlineFinderContext = createContext(null);

export function OnlineFinderProvider({ children }) {
  const [pickerMode, setPickerMode] = useState(null); // 'file' | 'folder' | null
  const resolverRef = useRef(null);
  const [fileAction, setFileAction] = useState(null); // file | null
  const [installPromptOpen, setInstallPromptOpen] = useState(false);
  const suppressUntilRef = useRef(0);

  const openFinder = useCallback((mode = "file") => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setPickerMode(mode);
    });
  }, []);

  const resolvePicker = useCallback((result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setPickerMode(null);
  }, []);

  const openFileAction = useCallback((file) => setFileAction(file), []);
  const closeFileAction = useCallback(() => setFileAction(null), []);

  const openFileBridgePath = useCallback((filePath) => {
    checkFinderApp().then((installed) => {
      if (installed) {
        openViaFinderApp(filePath);
      } else if (Date.now() >= suppressUntilRef.current) {
        setInstallPromptOpen(true);
      }
    });
  }, []);

  const value = { openFinder, openFileAction, openFileBridgePath };

  return (
    <OnlineFinderContext.Provider value={value}>
      {children}

      {pickerMode && (
        <OnlineFinderModal mode={pickerMode} onResolve={resolvePicker} onOpenFileAction={openFileAction} />
      )}

      {fileAction && (
        <FileActionModal file={fileAction} onClose={closeFileAction} onOpenFileBridgePath={openFileBridgePath} />
      )}

      {installPromptOpen && (
        <InstallPromptModal
          onClose={() => setInstallPromptOpen(false)}
          onDownloadClick={() => {
            suppressUntilRef.current = Date.now() + 20000;
          }}
        />
      )}
    </OnlineFinderContext.Provider>
  );
}

export function useOnlineFinder() {
  const ctx = useContext(OnlineFinderContext);
  if (!ctx) throw new Error("useOnlineFinder must be used within OnlineFinderProvider");
  return ctx;
}
