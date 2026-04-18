import React from 'react';
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
                <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
                    <div className="bg-white border border-gray-200 shadow-xl rounded-xl p-8 max-w-md w-full text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
                                <AlertTriangle className="h-8 w-8 text-red-600" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
                            <p className="text-sm text-gray-600 mb-6 px-4">
                                The application encountered an unexpected error and needs to be reloaded.
                            </p>
                            
                            {/* Display snippet of actual error for debugging */}
                            {this.state.error && (
                                <div className="bg-red-50 text-red-800 text-xs text-left p-3 rounded mb-6 font-mono overflow-auto max-h-32">
                                    {this.state.error.toString()}
                                </div>
                            )}
                        </div>
                        <Button 
                            onClick={() => window.location.reload()} 
                            className="bg-blue-600 hover:bg-blue-700 w-full h-12 text-base"
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
