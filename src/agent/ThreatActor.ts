import * as collections from '../util/collections';
import * as traverse from '../util/traverse';
import * as a from './agent.model';
import * as b from '../beliefs';
import * as w from '../model';
import * as AgentHelper from './AgentHelper';
import PathMap from '../util/PathMap';
import Vec from '../util/vector';

export class ThreatActor {
    constructor(
        public view: w.View,
        public beliefs: b.Beliefs,
        public params: a.AgentParams) {
    }

    public choose(actions: Map<string, w.Action>) {
        this.chooseSwitch(actions);
        this.chooseSpeed(actions);
    }

    private chooseSwitch(actions: Map<string, w.Action>) {
        const beliefs = this.beliefs;

        const recentEnemies =
            collections.toArray(beliefs.pacs.values())
            .filter(p => p.team === w.Teams.Enemy && p.alive && (beliefs.tick - p.seenTick) < this.params.NearbyEnemiesTicks);

        const allOccupants: string[][] = collections.init2D(beliefs.width, beliefs.height, (x, y) => beliefs.cells[y][x].wall ? w.Tiles.Wall : null);
        for (const pac of beliefs.pacs.values()) {
            if (pac.team === w.Teams.Self && pac.seenTick === beliefs.tick) {
                allOccupants[pac.pos.y][pac.pos.x] = pac.key;
            }
        }

        for (const pac of AgentHelper.pacsToControl(beliefs, actions)) {
            if (pac.abilityCooldownUntilTick < beliefs.tick) {
                const pathMap = PathMap.generate(pac.pos, beliefs, p => !allOccupants[p.y][p.x]);
                const threats = recentEnemies.filter(enemy => pathMap.cost(enemy.pos) - this.maxRange(enemy) <= 0);

                const closestEnemy = collections.minBy(threats, enemy => pathMap.cost(enemy.pos));
                if (closestEnemy) {
                    const dominantForm = AgentHelper.dominate(closestEnemy.form);
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

    private chooseSpeed(actions: Map<string, w.Action>) {
        const beliefs = this.beliefs;

        const enemies =
            collections.toArray(beliefs.pacs.values())
            .filter(p => p.team === w.Teams.Enemy && p.alive && (beliefs.tick - p.seenTick) < this.params.SpeedTicks);

        for (const pac of AgentHelper.pacsToControl(beliefs, actions)) {
            if (pac.abilityCooldownUntilTick < beliefs.tick) {
                const closestEnemy = collections.minBy(enemies, enemy => Vec.l1(pac.pos, enemy.pos));
                if (!closestEnemy || Vec.l1(pac.pos, closestEnemy.pos) > this.params.SpeedRange) {
                    const action: w.SpeedAction = { pac: pac.id, type: "speed" };
                    actions.set(pac.key, action);
                }
            }
        }
    }
}

export default ThreatActor;