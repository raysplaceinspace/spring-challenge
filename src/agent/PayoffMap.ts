import * as collections from '../util/collections';
import * as traverse from '../util/traverse';
import * as a from './agent.model';
import * as b from '../beliefs';
import * as w from '../model';
import * as AgentHelper from './AgentHelper';
import PathMap from '../util/PathMap';
import ValueMap from './ValueMap';
import Vec from '../util/vector';

const Debug = false;

export class PayoffMap {
    private payoffs: number[][];

    private constructor(private beliefs: b.Beliefs, private valueMap: ValueMap, private pathMap: PathMap, private params: a.AgentParams) {
        this.payoffs = collections.create2D(beliefs.width, beliefs.height, 0);
    }

    public static generate(pac: b.Pac, beliefs: b.Beliefs, valueMap: ValueMap, pathMap: PathMap, params: a.AgentParams): PayoffMap {
        const payoffMap = new PayoffMap(beliefs, valueMap, pathMap, params);
        payoffMap.propogateFrom(pac.pos);
        return payoffMap;
    }

    private propogateFrom(from: Vec) {
        const start = Date.now();

        const forwardMap = this.pathMap.forward();
        const numUpdates = this.propogate(from, forwardMap, 0, 0);

        if (Debug) {
            const elapsed = Date.now() - start;
            console.error(`Propogated ${numUpdates} payoffs in ${elapsed} ms`);
        }
    }

    private propogate(current: Vec, forwardMap: Array<Vec>[][], distance: number, accumulatedPayoff: number) {
        let numUpdates = 1; // 1 because we're updating this cell

        const currentPayoff = AgentHelper.discount(this.valueMap.value(current), distance, this.params);
        accumulatedPayoff += currentPayoff;

        this.payoffs[current.y][current.x] = accumulatedPayoff;

        for (const next of forwardMap[current.y][current.x]) {
            numUpdates += this.propogate(next, forwardMap, distance + 1, accumulatedPayoff);
        }
        return numUpdates;
    }

    clone() {
        const payoffMap = new PayoffMap(this.beliefs, this.valueMap, this.pathMap, this.params);
        payoffMap.payoffs = collections.clone2D(payoffMap.payoffs);
        return payoffMap;
    }

    payoff(pos: Vec) {
        return this.payoffs[pos.y][pos.x];
    }

    public* candidates(): Iterable<a.TargetCandidate> {
        for (const target of traverse.all(this.beliefs)) {
            const payoff = this.payoffs[target.y][target.x];
            if (payoff > 0) {
                yield {
                    target,
                    payoff,
                };
            }
        }
    }
}

export default PayoffMap;