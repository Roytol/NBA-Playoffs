import React from "react";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PREDICTION_STATUS_BADGE_CLASSES } from "@/constants/theme";

export function PredictionStatusBadge({
  status,
  points,
  compact = false,
  className,
}) {
  if (status === "correct") {
    return (
      <Badge
        className={cn(
          compact
            ? PREDICTION_STATUS_BADGE_CLASSES.correctCompact
            : PREDICTION_STATUS_BADGE_CLASSES.correct,
          className,
        )}
      >
        <Check className="w-3 h-3 mr-1" />
        {typeof points === "number" ? points : "Correct"}
        {!compact && typeof points === "number" ? " pts" : ""}
      </Badge>
    );
  }

  if (status === "pending") {
    return (
      <Badge className={cn(PREDICTION_STATUS_BADGE_CLASSES.pending, className)}>
        Pending
      </Badge>
    );
  }

  if (status === "incorrect") {
    return (
      <Badge
        className={cn(PREDICTION_STATUS_BADGE_CLASSES.incorrect, className)}
      >
        <X className={compact ? "w-3 h-3" : "w-3 h-3 mr-1"} />
        {compact ? "" : "Incorrect"}
      </Badge>
    );
  }

  return (
    <Badge className={cn(PREDICTION_STATUS_BADGE_CLASSES.unknown, className)}>
      Unknown
    </Badge>
  );
}
