import { usePageHeader } from "../../state/PageHeaderContext";
import { useOnlineFinder } from "../../features/finder/OnlineFinderContext";
import { FILE_BRIDGE_DMG_URL } from "../../features/finder/nativeApp";

// Ported from renderVeauFinderPage() in legacy/js/userDashboard.js.
export default function FileBridgePage() {
  usePageHeader("File Bridge");
  const { openFinder } = useOnlineFinder();

  return (
    <div className="file-bridge-page">
      <div className="file-bridge-download-card">
        <p className="file-bridge-download-intro">
          File Bridge opens files directly in Finder. It needs a small helper app called{" "}
          <strong>VeauFinder</strong> installed on your Mac.
        </p>
        <ol className="file-bridge-download-steps">
          <li>
            Download &amp; complete the installation.
            <br />
            <a href={FILE_BRIDGE_DMG_URL} download className="online-finder-btn online-finder-btn--primary file-bridge-download-btn">
              Download VeauFinder
            </a>
          </li>
          <li>
            Go to Applications and open the app. If you get the same error as in the image below, go to step 3.
            <img src="/assets/images/notOpened.png" alt="App not opened warning on macOS." />
          </li>
          <li>
            Go to Settings &gt; Privacy &amp; Security. Scroll down and click &quot;Open Anyway&quot;.
            <img src="/assets/images/open-anyway-settings.png" alt="Privacy &amp; Security settings showing Open Anyway." />
          </li>
        </ol>
        <button type="button" className="online-finder-btn online-finder-btn--ghost" onClick={() => openFinder("file")}>
          Open Online Finder
        </button>
      </div>
    </div>
  );
}
