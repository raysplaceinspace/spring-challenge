import * as collections from '../util/collections';
import * as traverse from '../util/traverse';
import * as a from './agent.model';
import * as b from '../beliefs';
import * as w from '../model';
import * as AgentHelper from './AgentHelper';
import PathMap from '../util/PathMap';
import { Threat, ThreatMap } from './ThreatMap';
import Vec from '../util/vector';

export class ThreatActor {
    constructor(
        public view: w.View,
        public beliefs: b.Beliefs,
        public params: a.AgentParams) {
    }

    public choose(actions: Map<string, w.Action>) {
        const threatMap = ThreatMap.generate(this.beliefs, this.params);
        for (const pac of AgentHelper.pacsToControl(this.beliefs, actions)) {
            const action = this.chooseOne(pac, threatMap);
            if (action) {
                actions.set(pac.key, action);
            }
        }
    }

    private chooseOne(pac: b.Pac, threatMap: ThreatMap): w.Action {
        if (pac.abilityCooldownUntilTick > this.beliefs.tick) { return null; } // Only consider pacs who can cast an ability

        const threats = threatMap.threats(pac);

        const closest = collections.minBy(threats, threat => threat.arrivalTicks);
        if (closest && closest.arrivalTicks <= 0) {
            // Be prepared to fight the enemy that could arrive
            const dominantForm = AgentHelper.dominate(closest.enemy.form);
            if (dominantForm !== pac.form) {
                const action: w.SwitchAction = { pac: pac.id, type: "switch", form: dominantForm };
                return action;
            }
        }

        if (!closest || closest.arrivalTicks >= this.params.SafeTicks) {
            const action: w.SpeedAction = { pac: pac.id, type: "speed" };
            return action;
        }

        return null;
    }
}

export default ThreatActor;