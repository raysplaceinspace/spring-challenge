import * as collections from '../util/collections';
import * as traverse from '../util/traverse';
import * as a from './agent.model';
import * as b from '../beliefs';
import * as w from '../model';
import * as AgentHelper from './AgentHelper';
import OccupantMap from './OccupantMap';
import PathMap from '../util/PathMap';
import PayoffMap from './PayoffMap';
import ValueMap from './ValueMap';
import Vec from '../util/vector';

interface CollectCandidate {
    moves: w.MoveAction[];
    payoff: number;
}

export class CollectActor {
    private initialOccupants: OccupantMap;
    private initialValueMap: ValueMap;

    constructor(
        public view: w.View,
        public beliefs: b.Beliefs,
        public params: a.AgentParams,
        public start = Date.now()) {

        this.initialOccupants = OccupantMap.generate(beliefs);
        this.initialValueMap = ValueMap.generate(beliefs);
    }

    choose(actions: Map<string, w.Action>) {
        const pacsToControl = collections.toArray(AgentHelper.pacsToControl(this.beliefs, actions))

        let best: CollectCandidate = null;
        let iteration = 0;
        while (true) {
            const candidate = this.chooseOne(pacsToControl);
            if (!best || candidate.payoff > best.payoff) {
                best = candidate;
            }

            ++iteration;

            const elapsed = Date.now() - this.start;
            if (elapsed >= this.params.MoveTimeoutMilliseconds) {
                break;
            }
        }
        console.error(`Chose moves after ${iteration} iterations`);

        if (best) {
            for (const move of best.moves) {
                actions.set(b.Pac.key(w.Teams.Self, move.pac), move);
            }
        }
    }

    private chooseOne(pacsToControl: b.Pac[]): CollectCandidate {
        // Clone because these will change as we lock in choices for each pac
        const occupants = this.initialOccupants.clone();
        const valueMap = this.initialValueMap.clone();

        const moves = new Array<w.MoveAction>();
        let totalPayoff = 0;

        for (const pac of collections.shuffle(pacsToControl)) { // Try a random order of pacs each time
            const pathMap = occupants.pathfind(pac);
            const payoffMap = PayoffMap.generate(pac, this.beliefs, valueMap, pathMap, this.params);
            const best = collections.maxBy(payoffMap.candidates(), candidate => candidate.payoff);
            if (best) {
                const path = pathMap.pathTo(best.target);

                // Add move
                const target = this.findTarget(pac, path);
                const action: w.MoveAction = { pac: pac.id, type: "move", target };
                moves.push(action);
                totalPayoff += best.payoff;

                // Block other pacs from doing the same thing
                valueMap.clear(path); // No other pac can go for the same pellets
                occupants.block(path[0], pac); // Stop other pacs from using the first step so we don't end up blocking each other
            }
        }

        return { moves, payoff: totalPayoff };
    }

    private findTarget(pac: b.Pac, path: Vec[]): Vec {
        let target = path[0];
        let targetHeading = target.clone().sub(pac.pos).unit();
        for (let i = 1; i < path.length; ++i) {
            const proceeding = path[i];
            const proceedingHeading = proceeding.clone().sub(pac.pos).unit();
            if (targetHeading.equals(proceedingHeading)) {
                target = proceeding;
            } else {
                break;
            }
        }
        return target;
    }
}

export default CollectActor;