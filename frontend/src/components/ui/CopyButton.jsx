import { useState } from "react";

// Ported from pmCopyValue()/the dev tracker's copy buttons — copies `value` to the
// clipboard and flashes "Copied" for 1.5s.
export default function CopyButton({ value, className = "third-btn" }) {
  const [copied, setCopied] = useState(false);
  const disabled = !value || value === "-";

  const handleClick = async () => {
    if (disabled) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const input = document.createElement("input");
        input.type = "text";
        input.readOnly = true;
        input.value = value;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <button type="button" className={className} disabled={disabled} onClick={handleClick}>
      {copied ? "Copied" : "📄"}
    </button>
  );
}
