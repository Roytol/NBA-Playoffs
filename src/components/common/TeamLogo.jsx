import React from 'react';
import { DEFAULT_NBA_LOGO, NBA_TEAM_LOGOS } from "@/constants/nba";

export default function TeamLogo({ team, className = "" }) {
    const logoUrl = NBA_TEAM_LOGOS[team] || DEFAULT_NBA_LOGO;

    return (
        <img
            src={logoUrl}
            alt={`${team} logo`}
            className={className}
            onError={(e) => {
                e.target.src = DEFAULT_NBA_LOGO;
                e.target.onerror = null;
            }}
        />
    );
}
