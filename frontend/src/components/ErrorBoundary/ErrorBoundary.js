import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console
    console.error('❌ Error caught by boundary:', error, errorInfo);
    
    // Update state
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Optional: Log to error reporting service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error, errorInfo) => {
    // Send to error tracking service (Sentry, LogRocket, etc.)
    // For now, we'll just log it
    const errorData = {
      timestamp: new Date().toISOString(),
      message: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.log('📋 Error logged:', errorData);
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container">
          <div className="error-boundary-card">
            <div className="error-icon">⚠️</div>
            
            <h1>Oops! Something went wrong</h1>
            
            <p className="error-message">
              We're sorry, but the application encountered an unexpected error.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <div className="error-details">
                <h3>Error Details (Development Only)</h3>
                <pre className="error-stack">
                  {this.state.error && this.state.error.toString()}
                </pre>
                <pre className="error-stack">
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}

            <div className="error-count">
              Error count: {this.state.errorCount}
            </div>

            <div className="error-actions">
              <button
                className="btn btn-primary"
                onClick={this.handleReset}
              >
                🔄 Try Again
              </button>
              <button
                className="btn btn-secondary"
                onClick={this.handleGoHome}
              >
                🏠 Go to Home
              </button>
            </div>

            <p className="error-support">
              If this problem persists, please contact support or refresh the page.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
