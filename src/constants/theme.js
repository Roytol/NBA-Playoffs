// Compound theme class tokens for cases where Tailwind state variants
// are easier to keep in JS than as standalone CSS utilities.

export const AUTH_TAB_TRIGGER_CLASSES = {
    signIn: "py-3 font-semibold data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none",
    register: "py-3 font-semibold data-[state=active]:text-red-500 data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none",
};

export const INTERACTIVE_INFO_LINK_CLASS = "transition-colors hover:text-blue-600";

export const DANGER_GHOST_BUTTON_CLASS = "text-status-danger hover:bg-red-50";

export const ADMIN_SUMMARY_COLOR_CLASSES = {
    activeSeason: "bg-blue-50 text-blue-800",
};
