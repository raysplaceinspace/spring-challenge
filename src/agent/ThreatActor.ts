import * as collections from '../util/collections';
import * as traverse from '../util/traverse';
import * as a from './agent.model';
import * as b from '../beliefs';
import * as w from '../model';
import * as AgentHelper from './AgentHelper';
import OccupantMap from './OccupantMap';
import { Threat, ThreatMap } from './ThreatMap';
import Vec from '../util/vector';

export class ThreatActor {
    constructor(
        public view: w.View,
        public beliefs: b.Beliefs,
        public occupantMap: OccupantMap,
        public params: a.AgentParams,
        public start = Date.now()) {
    }

    public choose(actions: Map<string, w.Action>) {
        const threatMap = ThreatMap.generate(this.beliefs, this.occupantMap, this.params);
        for (const pac of AgentHelper.pacsToControl(this.beliefs, actions)) {
            const action = this.chooseOne(pac, threatMap);
            if (action) {
                actions.set(pac.key, action);
            }
        }

        const elapsed = Date.now() - this.start;
        console.error(`Evaluated ${threatMap.size} threats in ${elapsed} ms, actions=${actions.size}`);
    }

    private chooseOne(pac: b.Pac, threatMap: ThreatMap): w.Action {
        if (pac.abilityCooldownUntilTick > this.beliefs.tick) { return null; } // Only consider pacs who can cast an ability

        const threats = threatMap.threats(pac);
        const closest = collections.minBy(threats, threat => threat.arrivalTicks);
        if (threats) {
            console.error(`${pac.key}: ${threats.length} threats, closest=${closest ? closest.arrivalTicks : 'null'}`);
        }

        if (closest && closest.arrivalTicks <= 0) {
            // Be prepared to fight the enemy that could arrive
            const dominantForm = AgentHelper.dominate(closest.enemy.form);
            if (dominantForm !== pac.form) {
                return {
                    pac: pac.id,
                    type: "switch",
                    form: dominantForm,
                    tag: closest.enemy.key,
                };
            }
        }

        // Enemy cannot reach us, even at maximum speed
        return {
            pac: pac.id,
            type: "speed",
            tag: closest ? `${closest.enemy.key}:${closest.arrivalTicks}` : '*',
        };
    }
}

export default ThreatActor;