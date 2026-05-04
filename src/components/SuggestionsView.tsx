/**
 * SuggestionsView — trending searches and autocomplete suggestions.
 *
 * Schema.org:
 * @see https://schema.org/SearchAction
 */
import { Search, TrendingDown, TrendingUp } from "lucide-react";
import type { Suggestion, TopSearch } from "../types";
import { sendMessage } from "../hooks/useOpenAI";

interface SuggestionsViewProps {
  suggestions?: Suggestion[];
  topSearches?: TopSearch[];
}

export function SuggestionsView({ suggestions, topSearches }: SuggestionsViewProps) {
  const hasTrending = topSearches && topSearches.length > 0;
  const hasSuggestions = suggestions && suggestions.length > 0;

  if (!hasTrending && !hasSuggestions) return null;

  return (
    <section
      className="space-y-4"
      itemScope
      itemType="https://schema.org/SearchAction"
      aria-label="Search suggestions"
    >
      {hasTrending && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-subtle)]">
            Trending
          </p>
          <ul className="space-y-1" role="list">
            {topSearches.map((ts) => (
              <li key={ts.term} role="listitem">
                <button
                  type="button"
                  onClick={() => sendMessage(`Search for ${ts.term}`)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[color:var(--ui-text)] transition-colors hover:bg-[color:var(--ui-pill)]"
                  aria-label={`Search: ${ts.term}`}
                >
                  {ts.trend === "up" && (
                    <TrendingUp
                      className="h-3.5 w-3.5 shrink-0 text-green-600"
                      aria-hidden="true"
                    />
                  )}
                  {ts.trend === "down" && (
                    <TrendingDown
                      className="h-3.5 w-3.5 shrink-0 text-red-500"
                      aria-hidden="true"
                    />
                  )}
                  {ts.trend === "stable" && (
                    <Search
                      className="h-3.5 w-3.5 shrink-0 text-[color:var(--ui-subtle)]"
                      aria-hidden="true"
                    />
                  )}
                  <span itemProp="query-input">{ts.term}</span>
                  {ts.count > 0 && (
                    <span className="ml-auto text-xs text-[color:var(--ui-subtle)]">
                      {ts.count.toLocaleString()}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasSuggestions && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-subtle)]">
            Suggestions
          </p>
          <div className="flex flex-wrap gap-2" role="list">
            {suggestions.map((s) => (
              <div key={s.term} role="listitem">
                <button
                  type="button"
                  onClick={() => sendMessage(s.term)}
                  className="ui-secondary-button rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                  aria-label={`Search: ${s.term}`}
                >
                  {s.term}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
