export default function SearchInput({ value, onChange, placeholder = "Search…" }) {
  return (
    <div className="search-input-wrap">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value ? (
        <button type="button" className="search-clear" aria-label="Clear search" onClick={() => onChange("")}>
          ×
        </button>
      ) : null}
    </div>
  );
}
