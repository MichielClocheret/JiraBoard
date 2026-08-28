import { usePageHeaderContext } from "../../state/PageHeaderContext";
import Avatar from "../ui/Avatar";

export default function ContentHeader() {
  const { header } = usePageHeaderContext();

  return (
    <header className="content-header">
      <div className="content-header-left">
        {header.avatarUser && <Avatar user={header.avatarUser} size="lg" />}
        <div>
          <h1 className="content-title">{header.title}</h1>
          {header.subtitle && <p className="content-subtitle">{header.subtitle}</p>}
        </div>
      </div>
      {header.actions && <div className="content-header-actions">{header.actions}</div>}
    </header>
  );
}
