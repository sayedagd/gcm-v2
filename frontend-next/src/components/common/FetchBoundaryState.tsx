import React from "react";
import { AlertTriangle, Loader2, Database } from "lucide-react";

type LoadingStateProps = {
  label: string;
};

export const LoadingState: React.FC<LoadingStateProps> = ({ label }) => {
  return (
    <div className="flex items-center justify-center gap-2 text-sm text-text-subtle py-8">
      <Loader2 size={16} className="animate-spin" />
      <span>{label}</span>
    </div>
  );
};

type ErrorStateProps = {
  title: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
};

export const ErrorState: React.FC<ErrorStateProps> = ({ title, message, retryLabel, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
        <AlertTriangle size={20} />
      </div>
      <div>
        <p className="text-sm font-semibold text-text-main">{title}</p>
        <p className="text-xs text-text-subtle mt-1">{message}</p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-subtle border border-border hover:bg-surface"
        >
          {retryLabel || "Retry"}
        </button>
      ) : null}
    </div>
  );
};

type EmptyStateProps = {
  title: string;
  description: string;
};

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description }) => {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <div className="w-12 h-12 rounded-xl bg-surface-subtle text-text-subtle flex items-center justify-center">
        <Database size={20} />
      </div>
      <div>
        <p className="text-sm font-semibold text-text-main">{title}</p>
        <p className="text-xs text-text-subtle mt-1">{description}</p>
      </div>
    </div>
  );
};
