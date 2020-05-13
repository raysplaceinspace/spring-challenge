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
import { factorial } from '../util/math';

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
        this.initialOccupants.precompute(pacsToControl);

        let best: CollectCandidate = null;
        let numIterations = 0;

        const numCombinations = factorial(pacsToControl.length);
        const combinations = collections.shuffle(collections.toArray(collections.range(numCombinations)));

        const collectStart = Date.now();
        for (const combination of combinations) {
            const candidate = this.chooseOne(this.sequence(pacsToControl, combination));
            if (!best || candidate.payoff > best.payoff) {
                best = candidate;
            }

            ++numIterations;

            const timePerIteration = (Date.now() - collectStart) / numIterations;
            const elapsed = Date.now() - this.start;
            if (elapsed + timePerIteration >= this.params.MoveTimeoutMilliseconds // Don't timeout
                || pacsToControl.length <= 1) { // If just 1 pac, we've already tried all possible combinations
                break;
            }
        }

        if (best) {
            for (const move of best.moves) {
                actions.set(b.Pac.key(w.Teams.Self, move.pac), move);
            }
        }

        const elapsed = Date.now() - this.start;
        console.error(`Chose moves for ${pacsToControl.length} pacs after ${numIterations}/${numCombinations} iterations (${elapsed} ms)`);
    }

    private sequence(pacsToControl: b.Pac[], sequenceNumber: number) {
        const remaining = [...pacsToControl];
        const result = new Array<b.Pac>();
        while (remaining.length > 0) {
            const index = sequenceNumber % remaining.length;
            sequenceNumber = Math.floor(sequenceNumber / remaining.length);
            result.push(...remaining.splice(index, 1));
        }
        return result;
    }

    private chooseOne(pacsToControl: b.Pac[]): CollectCandidate {
        // Clone because these will change as we lock in choices for each pac
        const occupants = this.initialOccupants.clone();
        const valueMap = this.initialValueMap.clone();

        const moves = new Array<w.MoveAction>();
        let totalPayoff = 0;

        for (const pac of pacsToControl) { // Try a random order of pacs each time
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