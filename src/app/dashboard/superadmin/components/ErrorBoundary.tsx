import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <h3 className="text-red-300 text-sm font-semibold mb-2">
              Unable to load component
            </h3>
            <p className="text-red-200 text-xs">
              There was an error loading this section. Please refresh the page to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
            >
              Refresh Page
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 