import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-text font-ui font-semibold text-sm mb-2">{title}</h3>
      <p className="text-muted font-ui text-xs max-w-xs leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-4 py-2 rounded-lg border border-emerald/40 text-emerald text-xs font-ui
            hover:bg-emerald/10 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
