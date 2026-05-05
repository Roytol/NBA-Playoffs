// Compound theme class tokens for cases where Tailwind state variants
// are easier to keep in JS than as standalone CSS utilities.

export const AUTH_TAB_TRIGGER_CLASSES = {
  signIn:
    "py-3 font-semibold data-[state=active]:text-status-info-strong data-[state=active]:border-b-2 data-[state=active]:border-status-info rounded-none",
  register:
    "py-3 font-semibold data-[state=active]:text-status-danger data-[state=active]:border-b-2 data-[state=active]:border-status-danger rounded-none",
};

export const INTERACTIVE_INFO_LINK_CLASS =
  "transition-colors hover:text-status-info-strong";

export const DANGER_GHOST_BUTTON_CLASS =
  "text-status-danger hover:bg-status-danger/10";

export const ADMIN_SUMMARY_COLOR_CLASSES = {
  activeSeason: "surface-status-info text-status-info-strong border",
};

export const PREDICTION_STATUS_BADGE_CLASSES = {
  correct: "bg-green-100 text-green-800 border-green-200",
  correctCompact: "bg-green-100 text-green-800",
  pending: "badge-status-info",
  incorrect: "badge-status-danger",
  unknown: "bg-muted text-muted-foreground border-border",
  currentUser: "surface-status-info text-status-info-strong border",
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
    east: "bg-card border-[hsl(var(--conference-east)/0.22)] shadow-[inset_0_0_0_1px_hsl(var(--conference-east)/0.08)] hover:border-[hsl(var(--conference-east)/0.35)]",
    west: "bg-card border-[hsl(var(--conference-west)/0.22)] shadow-[inset_0_0_0_1px_hsl(var(--conference-west)/0.08)] hover:border-[hsl(var(--conference-west)/0.35)]",
    neutral: "bg-card border-border",
  },
  matchupRing: {
    east: "ring-1 ring-[hsl(var(--conference-east)/0.25)] shadow-sm",
    west: "ring-1 ring-[hsl(var(--conference-west)/0.25)] shadow-sm",
    neutral: "ring-1 ring-blue-200/80 shadow-sm",
  },
  finalsPlaceholder:
    "rounded-md border border-dashed border-amber-400/30 bg-amber-500/10 flex flex-col items-center justify-center gap-0.5",
  mobileShell:
    "rounded-xl border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)/0.96),hsl(var(--background)/0.98))] px-2 py-2.5 shadow-[0_12px_35px_hsl(var(--foreground)/0.08)]",
};
