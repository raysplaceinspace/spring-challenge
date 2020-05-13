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
    private constructor(private beliefs: b.Beliefs, private payoffs: number[][]) {
    }

    public static generate(pac: b.Pac, beliefs: b.Beliefs, valueMap: ValueMap, pathMap: PathMap, params: a.AgentParams): PayoffMap {
        const payoffMap = collections.create2D(beliefs.width, beliefs.height, 0);

        const isochrones = pathMap.isochrones(params.SearchRange);
        for (let range = 0; range < isochrones.length; ++range) {
            const isochrone = isochrones[range];
            for (const current of isochrone) {
                const previous = pathMap.previousNeighbour(current);
                const previousPayoff = previous ? payoffMap[previous.y][previous.x] : 0;
                const currentPayoff = AgentHelper.discount(valueMap.value(current), range, params);
                payoffMap[current.y][current.x] = currentPayoff + previousPayoff;
            }
        }

        if (Debug) {
            console.error(`Generated payoff map from ${isochrones.filter(x => !!x).length} isochrones`);
        }

        return new PayoffMap(beliefs, payoffMap);
    }

    clone() {
        return new PayoffMap(this.beliefs, collections.clone2D(this.payoffs));
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