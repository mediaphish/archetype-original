import React from 'react';
import { AlertCircle } from 'lucide-react';
import { trackError } from '../../lib/operators/errorTracking';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console for development
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Store error details for display
    this.setState({
      error,
      errorInfo
    });

    // Track error to monitoring service
    trackError(error, errorInfo, {
      component: 'ErrorBoundary',
      userId: this.props.userId || null,
    }).catch(() => {
      // Silently fail - error tracking shouldn't break the app
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-red-200 shadow-lg max-w-2xl w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Something went wrong
                </h2>
                <p className="text-gray-600 mb-4">
                  An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
                </p>
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mb-4">
                    <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-2">
                      Error Details (Development Only)
                    </summary>
                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-64">
                      <div className="font-semibold text-red-600 mb-2">
                        {this.state.error.toString()}
                      </div>
                      {this.state.errorInfo && (
                        <div className="text-gray-600 whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </div>
                      )}
                    </pre>
                  </details>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={this.handleReset}
                    className="min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="min-h-[44px] px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
