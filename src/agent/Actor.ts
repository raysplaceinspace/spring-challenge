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
            .filter(p => p.team === w.Teams.Enemy && p.alive && (beliefs.tick - p.seenTick) < this.params.NearbyEnemiesTicks);

        const allOccupants: string[][] = collections.init2D(beliefs.width, beliefs.height, (x, y) => beliefs.cells[y][x].wall ? w.Tiles.Wall : null);
        for (const pac of beliefs.pacs.values()) {
            if (pac.team === w.Teams.Self && pac.seenTick === beliefs.tick) {
                allOccupants[pac.pos.y][pac.pos.x] = pac.key;
            }
        }

        for (const pac of this.pacsToControl(beliefs, actions)) {
            if (pac.abilityCooldownUntilTick < beliefs.tick) {
                const pathMap = PathMap.generate(pac.pos, beliefs, p => !allOccupants[p.y][p.x]);
                const threats = recentEnemies.filter(enemy => pathMap.cost(enemy.pos) - this.maxRange(enemy) - this.maxRange(pac) <= 0);

                const closestEnemy = collections.minBy(threats, enemy => pathMap.cost(enemy.pos));
                if (closestEnemy) {
                    const dominantForm = this.dominate(closestEnemy.form);
                    if (dominantForm !== pac.form) {
                        const action: w.SwitchAction = { pac: pac.id, type: "switch", form: dominantForm };
                        actions.set(pac.key, action);
                    }
                }
            }
        }
    }

    private maxRange(pac: b.Pac) {
        return (1 + this.beliefs.tick - pac.seenTick) * this.maxMovementSpeed(pac);
    }

    private maxMovementSpeed(pac: b.Pac): number {
        if (this.beliefs.tick < pac.speedUntilTick // Currently speeding
            || (pac.team === w.Teams.Enemy && pac.abilityCooldownUntilTick < this.beliefs.tick)) { // Or has the ability to speed
            return 2;
        } else {
            return 1;
        }
    }

    private chooseSpeed() {
        const beliefs = this.beliefs;
        const actions = this.actions;

        const enemies =
            collections.toArray(beliefs.pacs.values())
            .filter(p => p.team === w.Teams.Enemy && p.alive && (beliefs.tick - p.seenTick) < this.params.SpeedTicks);

        for (const pac of this.pacsToControl(beliefs, actions)) {
            if (pac.abilityCooldownUntilTick < beliefs.tick) {
                const closestEnemy = collections.minBy(enemies, enemy => Vec.l1(pac.pos, enemy.pos));
                if (!closestEnemy || Vec.l1(pac.pos, closestEnemy.pos) > this.params.SpeedRange) {
                    const action: w.SpeedAction = { pac: pac.id, type: "speed" };
                    actions.set(pac.key, action);
                }
            }
        }
    }

    private chooseMove() {
        const beliefs = this.beliefs;
        const actions = this.actions;

        const allOccupants = this.generateOccupants();
        const allCandidates = collections.toArray(this.generateCandidates(beliefs));
        const allPacsToControl = collections.toArray(this.pacsToControl(beliefs, actions));

        let bestMoves: w.MoveAction[] = null;
        let bestPayoff = -Infinity;

        let iteration = 0;
        while (true) {
            const occupants = collections.clone2D(allOccupants);
            const candidates = new Set<a.Candidate>(allCandidates);

            const moves = new Array<w.MoveAction>();
            let totalPayoff = 0;

            const pacsToControl = collections.shuffle(allPacsToControl);
            for (const pac of pacsToControl) {
                if (candidates.size <= 0) { break; }

                const pathMap = PathMap.generate(
                    pac.pos,
                    beliefs,
                    (pos) => this.passable(occupants, pos, pac));
                const closest = collections.maxBy(candidates, candidate => this.payoff(candidate, pac, pathMap));
                const cost = pathMap.cost(closest.pos);
                const payoff = this.payoff(closest, pac, pathMap);
                if (closest && cost < Infinity) {
                    const path = pathMap.pathTo(closest.pos);

                    // Choose target - multiple steps in a straight line
                    let target = path[0];
                    let targetHeading = target.clone().sub(pac.pos).unit();
                    for (let i = 1; i < path.length; ++i) {
                        const proceeding = path[i];
                        const proceedingHeading = proceeding.clone().sub(pac.pos).unit();
                        if (targetHeading.equals(proceedingHeading)) {
                            target = proceeding;
                        }
                    }

                    // Add move
                    const action: w.MoveAction = { pac: pac.id, type: "move", target };
                    moves.push(action);
                    totalPayoff += payoff;

                     // No other pac can go for the same pellet
                    candidates.delete(closest);

                     // Stop other pacs from using this square so we don't end up blocking each other
                    const next = path[0];
                    occupants[next.y][next.x] = pac.key;
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

    private generateOccupants() {
        const beliefs = this.beliefs;
        const allOccupants: string[][] = collections.init2D(beliefs.width, beliefs.height, (x, y) => beliefs.cells[y][x].wall ? w.Tiles.Wall : null);
        for (const pac of beliefs.pacs.values()) {
            if (pac.seenTick === beliefs.tick && pac.alive) {
                allOccupants[pac.pos.y][pac.pos.x] = pac.key;
            }
        }
        return allOccupants;

    }

    private payoff(candidate: a.Candidate, pac: b.Pac, pathMap: PathMap) {
        const cost = pathMap.cost(candidate.pos);
        if (candidate.requiredForm && pac.form !== candidate.requiredForm) {
            return -this.params.Penalty;
        }

        return this.discount(candidate.value, cost);
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
            && pac.form === this.dominate(enemy.form)
            && this.beliefs.tick < enemy.abilityCooldownUntilTick) {
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

    private* generateCandidates(beliefs: b.Beliefs): Iterable<a.Candidate> {
        for (const enemy of beliefs.pacs.values()) {
            if (enemy.team === w.Teams.Enemy && enemy.seenTick == beliefs.tick && enemy.alive) {
                yield {
                    value: this.params.AttackValue,
                    pos: enemy.pos,
                    requiredForm: this.dominate(enemy.form),
                };
            }
        }

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