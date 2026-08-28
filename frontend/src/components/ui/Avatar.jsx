export default function Avatar({ user, size = "md", className = "" }) {
  const url = user?.avatarUrls?.["48x48"] || user?.avatarUrl || null;
  const sizeClass = size === "lg" ? "avatar-lg" : "";
  const initial = (user?.displayName || "?").charAt(0).toUpperCase();

  if (url) {
    return <img className={`avatar ${sizeClass} ${className}`.trim()} src={url} alt="" />;
  }

  return (
    <span className={`avatar-fallback ${sizeClass} ${className}`.trim()} aria-hidden="true">
      {initial}
    </span>
  );
}
