import * as collections from '../util/collections';
import * as traverse from '../util/traverse';
import * as a from './agent.model';
import * as b from '../beliefs';
import * as w from '../model';
import * as AgentHelper from './AgentHelper';
import PathMap from '../util/PathMap';
import Vec from '../util/vector';

interface Candidate {
    target: Vec;
    payoff: number;
}

export class CollectActor {
    constructor(
        public view: w.View,
        public beliefs: b.Beliefs,
        public params: a.AgentParams,
        public start = Date.now()) {
    }

    choose(actions: Map<string, w.Action>) {
        const beliefs = this.beliefs;
        const initialOccupants = this.generateOccupants();
        const initialPacsToControl = collections.toArray(this.pacsToControl(beliefs, actions));
        const initialValueMap = this.generateValueMap();

        let bestMoves: w.MoveAction[] = null;
        let bestPayoff = -Infinity;

        let iteration = 0;
        while (true) {
            const occupants = collections.clone2D(initialOccupants);
            const valueMap = collections.clone2D(initialValueMap);

            const moves = new Array<w.MoveAction>();
            let totalPayoff = 0;

            const pacsToControl = collections.shuffle(initialPacsToControl);
            for (const pac of pacsToControl) {
                const pathMap = PathMap.generate(
                    pac.pos,
                    beliefs,
                    (pos) => this.passable(occupants, pos, pac));
                const payoffMap = this.generatePayoffMap(pac, valueMap, pathMap);
                const best = collections.maxBy(this.generateCandidates(pac, payoffMap), candidate => candidate.payoff);
                if (best) {
                    const path = pathMap.pathTo(best.target);

                    // Choose target - multiple steps in a straight line
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

                    // No other pac can go for the same pellets
                    for (let i = 0; i < path.length; ++i) {
                        const pos = path[i];
                        valueMap[pos.y][pos.x] = 0;
                    }

                    // Stop other pacs from using this square so we don't end up blocking each other
                    const next = path[0];
                    occupants[next.y][next.x] = pac.key;

                    // Add move
                    const action: w.MoveAction = { pac: pac.id, type: "move", target };
                    moves.push(action);
                    totalPayoff += best.payoff;
                }
            }

            if (totalPayoff > bestPayoff) {
                bestMoves = moves;
                bestPayoff = totalPayoff;
            }

            ++iteration;

            const elapsed = Date.now() - this.start;
            if (elapsed >= this.params.MoveTimeoutMilliseconds) {
                break;
            }
        }
        console.error(`Chose moves after ${iteration} iterations`);

        if (bestMoves) {
            for (const move of bestMoves) {
                actions.set(b.Pac.key(w.Teams.Self, move.pac), move);
            }
        }
    }

    private generatePayoffMap(pac: b.Pac, valueMap: number[][], pathMap: PathMap): number[][] {
        const payoffMap = collections.create2D(this.beliefs.width, this.beliefs.height, 0);

        const isochrones = pathMap.isochrones(this.params.SearchRange);
        for (let range = 0; range < isochrones.length; ++range) {
            const isochrone = isochrones[range];
            for (const current of isochrone) {
                const previous = pathMap.previousNeighbour(current);
                const previousPayoff = previous ? payoffMap[previous.y][previous.x] : 0;
                const currentPayoff = this.discount(valueMap[current.y][current.x], range);
                payoffMap[current.y][current.x] = currentPayoff + previousPayoff;
            }
        }

        return payoffMap;
    }

    private* generateCandidates(pac: b.Pac, payoffMap: number[][]): Iterable<Candidate> {
        for (const target of traverse.all(this.beliefs)) {
            const payoff = payoffMap[target.y][target.x];
            if (payoff > 0) {
                yield {
                    target,
                    payoff,
                };
            }
        }
    }

    private generateOccupants() {
        const beliefs = this.beliefs;

        const allOccupants: string[][] = collections.init2D(beliefs.width, beliefs.height, (x, y) => beliefs.cells[y][x].wall ? w.Tiles.Wall : null);

        // Occupying pacs
        for (const pac of beliefs.pacs.values()) {
            if (!(pac.seenTick === beliefs.tick && pac.alive)) {
                continue;
            }

            allOccupants[pac.pos.y][pac.pos.x] = pac.key;
        }

        // Identify collisions with enemy in the next turn and avoid
        const selfLocations = new Set<number>();
        for (const pac of beliefs.pacs.values()) {
            if (pac.team === w.Teams.Self && pac.alive && pac.seenTick === beliefs.tick) {
                for (const n of traverse.untilRange(pac.pos, AgentHelper.maxMovementSpeed(pac, this.beliefs), this.beliefs)) {
                    // Detect all locations this pac could move to
                    selfLocations.add(n.hash());
                }
            }
        }
        for (const enemy of beliefs.pacs.values()) {
            if (enemy.team === w.Teams.Enemy && enemy.alive && enemy.seenTick === beliefs.tick) {
                for (const n of traverse.neighbours(enemy.pos, this.beliefs)) {
                    if (selfLocations.has(n.hash()) && !allOccupants[n.y][n.x]) {
                        // Detected the enemy could move to the same square as us
                        allOccupants[n.y][n.x] = enemy.key;
                    }
                }
            }
        }

        return allOccupants;
    }

    private discount(value: number, ticks: number) {
        return value / Math.pow(this.params.DiscountRate, ticks);
    }

    private passable(occupants: string[][], pos: Vec, pac: b.Pac): boolean {
        const occupant = occupants[pos.y][pos.x];
        if (!occupant) {
            return true;
        }

        if (occupant === pac.key) {
            return true;
        }

        const enemy = this.beliefs.pacs.get(occupant);
        if (enemy
            && enemy.team === w.Teams.Enemy
            && enemy.alive
            && enemy.seenTick === this.beliefs.tick
            && pac.form === AgentHelper.dominate(enemy.form)
            && this.beliefs.tick < enemy.abilityCooldownUntilTick) {
            // We dominate the enemy
            return true;
        }

        return false;
    }

    private generateValueMap(): number[][] {
        const beliefs = this.beliefs;
        const valueMap = collections.init2D(
            beliefs.width,
            beliefs.height,
            (x, y) => beliefs.cells[y][x].expectedValue());
        return valueMap;
    }

    private pacsToControl(beliefs: b.Beliefs, actions: Map<string, w.Action>): Iterable<b.Pac> {
        return collections.filter(beliefs.pacs.values(), p => p.team === w.Teams.Self && p.alive && !actions.has(p.key))
    }
}

export default CollectActor;