import type { AppError } from "@shared/errors";
import type { ErrorInfo, ReactNode } from "react";

export type ErrorBoundaryFallbackProps = Readonly<{
  error: AppError;
  resetErrorBoundary: () => void;
}>;

export type ErrorBoundaryFallbackRender = (props: ErrorBoundaryFallbackProps) => ReactNode;

export type ErrorBoundaryProps = Readonly<{
  children: ReactNode;
  fallback?: ReactNode;
  fallbackRender?: ErrorBoundaryFallbackRender;
  onError?: (error: AppError, errorInfo: ErrorInfo) => void;
  resetKey?: unknown;
  resetKeys?: readonly unknown[];
}>;

export type ErrorBoundaryState = Readonly<{
  error: AppError | null;
}>;
