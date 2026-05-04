/**
 * OrdersView — purchase history.
 *
 * Schema.org:
 * @see https://schema.org/Order
 * @see https://schema.org/OrderStatus
 * @see https://schema.org/OrderItem
 */
import { Package } from "lucide-react";
import clsx from "clsx";
import type { Order } from "../types";
import { formatPrice } from "../format";
import { sendMessage } from "../hooks/useOpenAI";

interface OrdersViewProps {
  /** @see https://schema.org/Order */
  orders: Order[];
}

const STATUS_META: Record<
  string,
  { color: string; schemaOrg: string }
> = {
  delivered: {
    color: "text-emerald-400 bg-emerald-500/12",
    schemaOrg: "https://schema.org/OrderDelivered",
  },
  in_transit: {
    color: "text-sky-400 bg-sky-500/12",
    schemaOrg: "https://schema.org/OrderInTransit",
  },
  processing: {
    color: "text-amber-400 bg-amber-500/12",
    schemaOrg: "https://schema.org/OrderProcessing",
  },
  cancelled: {
    color: "text-rose-400 bg-rose-500/12",
    schemaOrg: "https://schema.org/OrderCancelled",
  },
};

export function OrdersView({ orders }: OrdersViewProps) {
  if (orders.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-3 py-12 text-[color:var(--ui-muted)]"
        role="status"
        aria-label="No orders"
      >
        <Package className="h-10 w-10" aria-hidden="true" />
        <p className="text-sm font-medium">No orders yet</p>
      </div>
    );
  }

  return (
    <section className="space-y-3" aria-label="Order history">
      <h2 className="text-base font-semibold text-[color:var(--ui-text)]">Order history</h2>
      <ul className="space-y-3" role="list">
        {orders.map((order) => {
          const statusMeta = STATUS_META[order.status];
          return (
            <li
              key={order.id}
              className="ui-card-surface space-y-2 rounded-2xl p-4"
              itemScope
              itemType="https://schema.org/Order"
              role="listitem"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-[color:var(--ui-subtle)]">
                    Order{" "}
                    <span itemProp="orderNumber">#{order.id}</span>
                  </p>
                  <p className="text-xs text-[color:var(--ui-subtle)]">
                    <time dateTime={order.date}>{order.date}</time>
                  </p>
                </div>
                <span
                  className={clsx(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    statusMeta?.color ?? "text-[color:var(--ui-muted)] bg-[color:var(--ui-pill)]",
                  )}
                  itemProp="orderStatus"
                  content={statusMeta?.schemaOrg}
                >
                  {order.statusLabel}
                </span>
              </div>

              {/* Order item thumbnails */}
              <div className="flex gap-2" role="list" aria-label="Items in order">
                {order.items.slice(0, 4).map((item, i) => (
                  <div
                    key={i}
                    className="ui-image-surface h-12 w-12 overflow-hidden rounded-xl"
                    role="listitem"
                    itemProp="orderedItem"
                    itemScope
                    itemType="https://schema.org/OrderItem"
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.productName}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                        itemProp="image"
                      />
                    ) : (
                      <Package
                        className="h-full w-full p-3 text-[color:var(--ui-subtle)]"
                        aria-hidden="true"
                      />
                    )}
                    <span className="sr-only" itemProp="name">{item.productName}</span>
                  </div>
                ))}
                {order.items.length > 4 && (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--ui-pill)] text-xs font-medium text-[color:var(--ui-muted)]">
                    +{order.items.length - 4}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <p
                  className="text-sm font-semibold text-[color:var(--ui-text)]"
                  itemProp="price"
                  content={String(order.total)}
                >
                  {formatPrice(order.total)}
                </p>
                {order.trackingCode && (
                  <button
                    type="button"
                    onClick={() => sendMessage(`Track order ${order.id}`)}
                    className="text-xs font-medium text-[color:var(--ui-muted)] underline transition-colors hover:text-[color:var(--ui-text)]"
                  >
                    Track shipment
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
