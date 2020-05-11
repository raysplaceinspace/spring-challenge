import * as collections from '../util/collections';
import * as traverse from '../util/traverse';
import * as b from '../beliefs';
import * as w from '../model';
import PathMap from '../util/PathMap';
import Vec from '../util/vector';

export interface AgentParams {
    DiscountRate: number;
    RecentEnemiesTicks: number;
}

export class Agent {
    constructor(view: w.View, public params: AgentParams = Agent.defaults()) {
    }

    static defaults(): AgentParams {
        return {
            DiscountRate: 1.07,
            RecentEnemiesTicks: 10,
        };
    }

    choose(beliefs: b.Beliefs): w.Action[] {
        const actions = new Map<string, w.Action>();
        this.chooseSwitch(beliefs, actions);
        this.chooseSpeed(beliefs, actions);
        this.chooseMove(beliefs, actions);
        this.chooseWait(beliefs, actions);
        return collections.toArray(actions.values());
    }

    private chooseSwitch(beliefs: b.Beliefs, actions: Map<string, w.Action>) {
        const recentEnemies =
            collections.toArray(beliefs.pacs.values())
            .filter(p => p.team === w.Teams.Enemy && p.alive && (beliefs.tick - p.seenTick) < this.params.RecentEnemiesTicks);

        for (const pac of this.pacsToControl(beliefs, actions)) {
            if (pac.abilityTick <= 0) {
                const closestEnemy = collections.minBy(recentEnemies, enemy => Vec.l1(pac.pos, enemy.pos));
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

    private chooseSpeed(beliefs: b.Beliefs, actions: Map<string, w.Action>) {
        for (const pac of this.pacsToControl(beliefs, actions)) {
            if (pac.abilityTick <= 0) {
                const action: w.SpeedAction = { pac: pac.id, type: "speed" };
                actions.set(pac.key, action);
            }
        }
    }

    private chooseMove(beliefs: b.Beliefs, actions: Map<string, w.Action>) {
        const occupants: string[][] = collections.init2D(beliefs.width, beliefs.height, (x, y) => beliefs.cells[y][x].wall ? w.Tiles.Wall : null);
        for (const pac of beliefs.pacs.values()) {
            if (pac.seenTick === beliefs.tick) {
                occupants[pac.pos.y][pac.pos.x] = pac.key;
            }
        }

        const pellets = new Set<b.Cell>(this.findPellets(beliefs));
        for (const pac of this.pacsToControl(beliefs, actions)) {
            if (pellets.size <= 0) {
                break;
            }

            const pathMap = PathMap.generate(
                pac.pos,
                beliefs,
                (pos) => this.passable(occupants, pos, pac));
            const closest = collections.maxBy(pellets, pellet => this.payoff(pellet.value, pathMap.cost(pellet.pos)));
            if (closest && pathMap.cost(closest.pos) < Infinity) {
                const next = pathMap.pathTo(closest.pos)[0];
                const action: w.MoveAction = { pac: pac.id, type: "move", target: closest.pos };
                actions.set(pac.key, action);

                pellets.delete(closest); // No other pac can go for the same pellet
                occupants[next.y][next.x] = pac.key; // Stop other pacs from using this square so we don't end up blocking each other
            }
        }
    }

    private payoff(value: number, ticks: number) {
        return value / Math.pow(this.params.DiscountRate, ticks);
    }

    private passable(occupants: string[][], pos: Vec, pac: b.Pac): boolean {
        const occupant = occupants[pos.y][pos.x];
        return (!occupant || occupant === pac.key);
    }

    private chooseWait(beliefs: b.Beliefs, actions: Map<string, w.Action>) {
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

export default Agent;