import * as collections from '../util/collections';
import * as traverse from '../util/traverse';
import * as a from './agent.model';
import * as b from '../beliefs';
import * as w from '../model';
import PathMap from '../util/PathMap';
import Vec from '../util/vector';

export class Actor {
    private actions = new Map<string, w.Action>();
    private start = Date.now();

    constructor(
        public view: w.View,
        public beliefs: b.Beliefs,
        public params: a.AgentParams) {
    }

    choose(): w.Action[] {
        this.chooseSwitch();
        this.chooseSpeed();
        this.chooseMove();
        this.chooseWait();
        return collections.toArray(this.actions.values());
    }

    private chooseSwitch() {
        const beliefs = this.beliefs;
        const actions = this.actions;

        const recentEnemies =
            collections.toArray(beliefs.pacs.values())
            .filter(p => p.team === w.Teams.Enemy && p.alive && (beliefs.tick - p.seenTick) < this.params.RecentEnemiesTicks);

        for (const pac of this.pacsToControl(beliefs, actions)) {
            if (pac.abilityTick <= 0) {
                const closestEnemy = collections.minBy(recentEnemies, enemy => Vec.l1(pac.pos, enemy.pos));
                if (closestEnemy && Vec.l1(pac.pos, closestEnemy.pos) <= this.params.NearbyEnemyRange) {
                    const dominantForm = this.dominate(closestEnemy.form);
                    if (dominantForm !== pac.form) {
                        const action: w.SwitchAction = { pac: pac.id, type: "switch", form: dominantForm };
                        actions.set(pac.key, action);
                    }
                }
            }
        }
    }

    private chooseSpeed() {
        const beliefs = this.beliefs;
        const actions = this.actions;
        
        if (!this.params.UseSpeed) { return; }

        for (const pac of this.pacsToControl(beliefs, actions)) {
            if (pac.abilityTick <= 0) {
                const action: w.SpeedAction = { pac: pac.id, type: "speed" };
                actions.set(pac.key, action);
            }
        }
    }

    private chooseMove() {
        const beliefs = this.beliefs;
        const actions = this.actions;

        const allOccupants: string[][] = collections.init2D(beliefs.width, beliefs.height, (x, y) => beliefs.cells[y][x].wall ? w.Tiles.Wall : null);
        for (const pac of beliefs.pacs.values()) {
            if (pac.seenTick === beliefs.tick) {
                allOccupants[pac.pos.y][pac.pos.x] = pac.key;
            }
        }

        const allPellets = collections.toArray(this.findPellets(beliefs));
        const allPacsToControl = collections.toArray(this.pacsToControl(beliefs, actions));

        let bestMoves: w.MoveAction[] = null;
        let bestPayoff = -Infinity;

        let iteration = 0;
        while (true) {
            const occupants = collections.clone2D(allOccupants);
            const pellets = new Set<b.Cell>(allPellets);

            const moves = new Array<w.MoveAction>();
            let totalPayoff = 0;

            const pacsToControl = collections.shuffle(allPacsToControl);
            for (const pac of pacsToControl) {
                if (pellets.size <= 0) { break; }

                const pathMap = PathMap.generate(
                    pac.pos,
                    beliefs,
                    (pos) => this.passable(allOccupants, pos, pac));
                const closest = collections.maxBy(pellets, pellet => this.payoff(pellet.value, pathMap.cost(pellet.pos)));
                const cost = pathMap.cost(closest.pos);
                const payoff = this.payoff(closest.value, cost);
                if (closest && cost < Infinity) {
                    const next = pathMap.pathTo(closest.pos)[0];
                    const action: w.MoveAction = { pac: pac.id, type: "move", target: closest.pos };
                    moves.push(action);

                    totalPayoff += payoff;
                    pellets.delete(closest); // No other pac can go for the same pellet
                    occupants[next.y][next.x] = pac.key; // Stop other pacs from using this square so we don't end up blocking each other
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

    private payoff(value: number, ticks: number) {
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

        const other = this.beliefs.pacs.get(occupant);
        if (other && other.team === w.Teams.Enemy && other.seenTick === this.beliefs.tick && pac.form === this.dominate(other.form)) {
            // We dominate the enemy
            return true;
        }

        return false;
    }

    private chooseWait() {
        const beliefs = this.beliefs;
        const actions = this.actions;

        for (const pac of this.pacsToControl(beliefs, actions)) {
            const action: w.WaitAction = { pac: pac.id, type: "wait" };
            actions.set(pac.key, action);
        }
    }

    private* findPellets(beliefs: b.Beliefs): Iterable<b.Cell> {
        for (const pos of traverse.all(beliefs)) {
            const cell = beliefs.cells[pos.y][pos.x];
            if (cell.value > 0) {
                yield cell;
            }
        }
    }


    private pacsToControl(beliefs: b.Beliefs, actions: Map<string, w.Action>): Iterable<b.Pac> {
        return collections.filter(beliefs.pacs.values(), p => p.team === w.Teams.Self && p.alive && !actions.has(p.key))
    }

    private dominate(form: string) {
        switch (form) {
            case w.Forms.Scissors: return w.Forms.Rock;
            case w.Forms.Paper: return w.Forms.Scissors;
            case w.Forms.Rock: return w.Forms.Paper;
            default: throw `Unknown form: ${form}`;
        }
    }
}

export default Actor;