import ChampionPick from "@/components/dashboard/pre-playoff-picks/ChampionPick";
import FinalsMVPPick from "@/components/dashboard/pre-playoff-picks/FinalsMVPPick";

export { ChampionPick, FinalsMVPPick };

export default function PrePlayoffPicks({ hasChampionPick, hasFinalsMVPPick, onSave }) {
    return (
        <div>
            {!hasChampionPick && <ChampionPick onSave={onSave} />}
            {!hasFinalsMVPPick && <FinalsMVPPick onSave={onSave} />}
        </div>
    );
}
