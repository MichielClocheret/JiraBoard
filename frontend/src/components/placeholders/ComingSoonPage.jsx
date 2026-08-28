import { usePageHeader } from "../../state/PageHeaderContext";

export default function ComingSoonPage({ title, description }) {
  usePageHeader(title);

  return (
    <div className="coming-soon">
      <span className="coming-soon__badge">Coming soon</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
