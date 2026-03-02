import * as Sentry from '@sentry/tanstackstart-react';
import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

import { ErrorFallback } from './ErrorFallback';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: unknown;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    Sentry.captureException(error, {
      tags: {
        location:
          typeof window !== 'undefined' ? window.location.pathname : 'unknown',
        component: 'ErrorBoundary',
      },
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback error={this.state.error} reset={this.handleReset} />
      );
    }

    return this.props.children;
  }
}
