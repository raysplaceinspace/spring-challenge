import * as collections from '../util/collections';
import * as traverse from '../util/traverse';
import * as b from '../beliefs';
import * as w from '../model';
import Vec from '../util/vector';

export default class Agent {
    constructor(view: w.View) {
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
            .filter(p => p.team === w.Teams.Enemy && p.alive && (beliefs.tick - p.seenTick) < 10);

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
        const pellets = new Set<Vec>(this.findPellets(beliefs));
        const pacs = new Set<b.Pac>(this.pacsToControl(beliefs, actions));

        while (pacs.size > 0 && pellets.size > 0) {
            let bestPac: b.Pac = null;
            let bestPellet: Vec = null;
            let bestDistance: number = Infinity;
            for (const pac of pacs) {
                const closestPellet = collections.minBy(pellets, pellet => Vec.l1(pac.pos, pellet));
                const distance = Vec.l1(pac.pos, closestPellet);
                if (distance < bestDistance) {
                    bestPac = pac;
                    bestPellet = closestPellet;
                    bestDistance = distance;
                }
            }

            if (bestPac && bestPellet) {
                const action: w.MoveAction = { pac: bestPac.id, type: "move", target: bestPellet };
                actions.set(bestPac.key, action);
                pellets.delete(bestPellet);
                pacs.delete(bestPac);
            } else {
                break;
            }
        }
    }

    private chooseWait(beliefs: b.Beliefs, actions: Map<string, w.Action>) {
        for (const pac of this.pacsToControl(beliefs, actions)) {
            const action: w.WaitAction = { pac: pac.id, type: "wait" };
            actions.set(pac.key, action);
        }
    }

    private* findPellets(beliefs: b.Beliefs): Iterable<Vec> {
        for (const pos of traverse.all(beliefs)) {
            if (beliefs.cells[pos.y][pos.x].pellet > 0) {
                yield pos;
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
