import * as React from "react";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastProvider = React.forwardRef(({ ...props }, ref) => (
    <div
        ref={ref}
        className="fixed bottom-0 left-1/2 z-[100] flex max-h-screen w-full -translate-x-1/2 flex-col-reverse p-4 sm:bottom-4 md:max-w-[380px] gap-2"
        {...props}
    />
));
ToastProvider.displayName = "ToastProvider";

const ToastViewport = React.forwardRef(({ ...props }, ref) => (
    <div
        ref={ref}
        className="fixed bottom-0 left-1/2 z-[100] flex max-h-screen w-full -translate-x-1/2 flex-col-reverse outline-none p-4 sm:bottom-4 md:max-w-[380px] gap-2"
        {...props}
    />
));
ToastViewport.displayName = "ToastViewport";

const toastVariants = cva(
    "group pointer-events-auto relative flex w-full items-center justify-between space-x-3 overflow-hidden rounded-xl border px-4 py-3 shadow-md transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-bottom-full data-[state=open]:slide-in-from-bottom-[120%]",
    {
        variants: {
            variant: {
                default: "border-blue-100 bg-white text-gray-900 shadow-blue-600/5",
                destructive: "border-red-200 bg-red-50 text-red-900 shadow-red-600/5",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

const Toast = React.forwardRef(({ className, variant, onOpenChange, open, ...props }, ref) => {
    return (
        <div
            ref={ref}
            className={cn(toastVariants({ variant }), className)}
            {...props}
        />
    );
});
Toast.displayName = "Toast";

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-xs font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
            className
        )}
        {...props}
    />
));
ToastAction.displayName = "ToastAction";

const ToastClose = React.forwardRef(({ className, ...props }, ref) => (
    <button
        ref={ref}
        className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 opacity-0 transition-opacity hover:text-gray-900 hover:bg-gray-100 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100",
            className
        )}
        toast-close=""
        {...props}
    >
        <X className="h-4 w-4" />
    </button>
));
ToastClose.displayName = "ToastClose";

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("text-sm font-semibold text-gray-900", className)}
        {...props}
    />
));
ToastTitle.displayName = "ToastTitle";

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("text-xs text-gray-500", className)}
        {...props}
    />
));
ToastDescription.displayName = "ToastDescription";

export {
    ToastProvider,
    ToastViewport,
    Toast,
    ToastTitle,
    ToastDescription,
    ToastClose,
    ToastAction,
}; 