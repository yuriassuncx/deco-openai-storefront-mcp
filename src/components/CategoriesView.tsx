/**
 * CategoriesView — browse store categories.
 *
 * Schema.org:
 * @see https://schema.org/ItemList
 */
import type { CategoryInfo } from "../types";
import { sendMessage } from "../hooks/useOpenAI";

interface CategoriesViewProps {
  /** @see https://schema.org/ItemList */
  categories: CategoryInfo[];
  accentColor: string;
}

export function CategoriesView({ categories, accentColor }: CategoriesViewProps) {
  void accentColor;

  return (
    <section
      className="space-y-3"
      itemScope
      itemType="https://schema.org/ItemList"
      aria-label="Shop by category"
    >
      <h2 className="text-base font-semibold text-[color:var(--ui-text)]" itemProp="name">
        Shop by category
      </h2>
      <div className="grid grid-cols-2 gap-2" role="list">
        {categories.map((cat, i) => (
          <div
            key={cat.name}
            role="listitem"
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
          >
            <meta itemProp="position" content={String(i + 1)} />
            <button
              type="button"
              onClick={() => sendMessage(`Show me ${cat.name}`)}
              className="ui-card-surface flex w-full items-center gap-2.5 rounded-2xl p-3 text-left transition-colors hover:border-[color:var(--ui-border-strong)] hover:bg-[color:var(--ui-pill)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ui-border-strong)]"
              aria-label={`Browse ${cat.name}`}
            >
              {cat.emoji && (
                <span className="text-xl" aria-hidden="true">
                  {cat.emoji}
                </span>
              )}
              <div className="min-w-0">
                <p
                  className="truncate text-sm font-medium text-[color:var(--ui-text)]"
                  itemProp="name"
                >
                  {cat.name}
                </p>
                {cat.count != null && (
                  <p className="text-[10px] text-[color:var(--ui-subtle)]">
                    {cat.count} item{cat.count === 1 ? "" : "s"}
                  </p>
                )}
              </div>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
