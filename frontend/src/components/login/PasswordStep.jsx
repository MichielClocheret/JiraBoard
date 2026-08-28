export default function PasswordStep({ value, onChange, onEnter }) {
  return (
    <div className="chat-field">
      <label htmlFor="login-chat-password" className="chat-field-label">
        Chat password
      </label>
      <input
        type="password"
        id="login-chat-password"
        className="chat-input"
        placeholder="Min. 6 characters"
        autoComplete="current-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter();
          }
        }}
      />
    </div>
  );
}
