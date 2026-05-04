// Compound theme class tokens for cases where Tailwind state variants
// are easier to keep in JS than as standalone CSS utilities.

export const AUTH_TAB_TRIGGER_CLASSES = {
  signIn:
    "py-3 font-semibold data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none",
  register:
    "py-3 font-semibold data-[state=active]:text-red-500 data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none",
};

export const INTERACTIVE_INFO_LINK_CLASS =
  "transition-colors hover:text-blue-600";

export const DANGER_GHOST_BUTTON_CLASS = "text-status-danger hover:bg-red-50";

export const ADMIN_SUMMARY_COLOR_CLASSES = {
  activeSeason: "bg-blue-50 text-blue-800",
};

export const PREDICTION_STATUS_BADGE_CLASSES = {
  correct: "bg-green-100 text-green-800 border-green-200",
  correctCompact: "bg-green-100 text-green-800",
  pending: "badge-status-info",
  incorrect: "badge-status-danger",
  unknown: "bg-gray-100 text-gray-800 border-gray-200",
  currentUser: "bg-blue-100 text-blue-800",
};

export const BRACKET_THEME = {
  brandBar: {
    east: "bg-[hsl(var(--conference-east))]",
    divider: "bg-[hsl(var(--brand-gold))]",
    west: "bg-[hsl(var(--conference-west))]",
  },
  conferenceText: {
    east: "text-[hsl(var(--conference-east))]",
    west: "text-[hsl(var(--conference-west))]",
  },
  conferenceBorder: {
    east: "border-[hsl(var(--conference-east))]",
    west: "border-[hsl(var(--conference-west))]",
  },
  matchupTint: {
    east: "bg-white border-[hsl(var(--conference-east)/0.22)] shadow-[inset_0_0_0_1px_hsl(var(--conference-east)/0.04)] hover:border-[hsl(var(--conference-east)/0.35)]",
    west: "bg-white border-[hsl(var(--conference-west)/0.22)] shadow-[inset_0_0_0_1px_hsl(var(--conference-west)/0.04)] hover:border-[hsl(var(--conference-west)/0.35)]",
    neutral: "bg-white border-gray-200/90",
  },
  matchupRing: {
    east: "ring-1 ring-[hsl(var(--conference-east)/0.25)] shadow-sm",
    west: "ring-1 ring-[hsl(var(--conference-west)/0.25)] shadow-sm",
    neutral: "ring-1 ring-blue-200/80 shadow-sm",
  },
  finalsPlaceholder:
    "rounded-md border border-dashed border-amber-300/40 bg-amber-50/50 flex flex-col items-center justify-center gap-0.5",
  mobileShell:
    "rounded-xl border border-gray-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.98))] px-2 py-2.5 shadow-[0_12px_35px_rgba(15,23,42,0.06)]",
};
