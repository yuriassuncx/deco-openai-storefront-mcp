import { ChevronLeft } from "lucide-react";

interface BackButtonProps {
  label?: string;
  onClick: () => void;
}

export function BackButton({ label = "Back", onClick }: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ui-back-button ui-secondary-button inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium shadow-sm"
      aria-label={label}
    >
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}
