import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-8 text-center shadow-xl">
            <div className="flex justify-center">
              <div className="badge-status-danger h-16 w-16 rounded-full flex items-center justify-center border">
                <AlertTriangle className="text-status-danger h-8 w-8" />
              </div>
            </div>
            <div>
              <h2 className="mb-2 text-2xl font-bold text-foreground">
                Something went wrong
              </h2>
              <p className="mb-6 px-4 text-sm text-muted-foreground">
                The application encountered an unexpected error and needs to be
                reloaded.
              </p>

              {/* Display snippet of actual error for debugging */}
              {this.state.error && (
                <div className="surface-status-danger text-status-danger-strong text-xs text-left p-3 rounded mb-6 font-mono overflow-auto max-h-32 border">
                  {this.state.error.toString()}
                </div>
              )}
            </div>
            <Button
              onClick={() => window.location.reload()}
              className="h-12 w-full bg-status-info-strong text-primary-foreground hover:opacity-90 text-base"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
