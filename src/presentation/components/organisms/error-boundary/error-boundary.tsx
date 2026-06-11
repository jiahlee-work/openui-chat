"use client";

import { AppError, ERROR_CODE } from "@shared/errors";
import { isAppError } from "@shared/guards";
import { Component, type ErrorInfo } from "react";
import type {
  ErrorBoundaryFallbackProps,
  ErrorBoundaryProps,
  ErrorBoundaryState,
} from "./error-boundary.types";

const INITIAL_STATE: ErrorBoundaryState = {
  error: null,
};

function toAppError(error: Error): AppError {
  if (isAppError(error)) {
    return error;
  }

  return new AppError({
    code: ERROR_CODE.UNKNOWN,
    message: error.message || "An unknown error occurred.",
    cause: error,
    retryable: false,
  });
}

function haveResetKeysChanged(
  previousProps: ErrorBoundaryProps,
  currentProps: ErrorBoundaryProps,
): boolean {
  if (!Object.is(previousProps.resetKey, currentProps.resetKey)) {
    return true;
  }

  const previousResetKeys = previousProps.resetKeys ?? [];
  const currentResetKeys = currentProps.resetKeys ?? [];

  return (
    previousResetKeys.length !== currentResetKeys.length ||
    previousResetKeys.some((resetKey, index) => !Object.is(resetKey, currentResetKeys[index]))
  );
}

function DefaultErrorFallback({ resetErrorBoundary }: ErrorBoundaryFallbackProps) {
  return (
    <div role="alert">
      <p>Something went wrong.</p>
      <button type="button" onClick={resetErrorBoundary}>
        Try again
      </button>
    </div>
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = INITIAL_STATE;

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      error: toAppError(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(this.state.error ?? toAppError(error), errorInfo);
  }

  componentDidUpdate(previousProps: ErrorBoundaryProps): void {
    if (this.state.error !== null && haveResetKeysChanged(previousProps, this.props)) {
      this.resetErrorBoundary();
    }
  }

  private resetErrorBoundary = (): void => {
    this.setState(INITIAL_STATE);
  };

  render() {
    const { children, fallback, fallbackRender } = this.props;
    const { error } = this.state;

    if (error === null) {
      return children;
    }

    const fallbackProps: ErrorBoundaryFallbackProps = {
      error,
      resetErrorBoundary: this.resetErrorBoundary,
    };

    if (fallbackRender !== undefined) {
      return fallbackRender(fallbackProps);
    }

    if (fallback !== undefined) {
      return fallback;
    }

    return <DefaultErrorFallback {...fallbackProps} />;
  }
}
