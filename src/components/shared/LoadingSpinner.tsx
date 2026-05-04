interface LoadingSpinnerProps {
  accentColor: string;
  label?: string;
}

export function LoadingSpinner({ accentColor, label = "Loading…" }: LoadingSpinnerProps) {
  return (
    <div
      className="flex min-h-48 flex-col items-center justify-center gap-3 text-[color:var(--ui-muted)]"
      role="status"
      aria-label={label}
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-3 border-[color:var(--ui-border)]"
        style={{ borderTopColor: accentColor }}
        aria-hidden="true"
      />
      <p className="text-sm">{label}</p>
    </div>
  );
}
