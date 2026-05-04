import type { Suggestion } from "../types";
import { sendMessage } from "../hooks/useOpenAI";
import clsx from "clsx";
import { getContrastTextColor } from "../color";

interface MessageViewProps {
  message?: string;
  error?: string;
  suggestions?: Suggestion[];
  accentColor: string;
}

export function MessageView({ message, error, suggestions, accentColor }: MessageViewProps) {
  const isError = Boolean(error);
  const text = error ?? message ?? "";
  const accentTextColor = getContrastTextColor(accentColor);

  return (
    <div className="space-y-4">
      {text && (
        <div
          className={clsx(
            "rounded-2xl border p-4 text-sm leading-relaxed",
            isError
              ? "border-[color:var(--ui-danger-soft)] bg-[color:var(--ui-danger-soft)] text-[color:var(--ui-danger)]"
              : "border-[color:var(--ui-border)] bg-[color:var(--ui-pill)] text-[color:var(--ui-muted)]",
          )}
          role={isError ? "alert" : "status"}
        >
          {text}
        </div>
      )}
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2" role="list" aria-label="Suggestions">
          {suggestions.map((s) => (
            <div key={s.term} role="listitem">
              <button
                type="button"
                onClick={() => sendMessage(s.term)}
                className="ui-secondary-button rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = accentColor;
                  (e.currentTarget as HTMLButtonElement).style.color = accentTextColor;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "";
                  (e.currentTarget as HTMLButtonElement).style.color = "";
                }}
              >
                {s.term}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
