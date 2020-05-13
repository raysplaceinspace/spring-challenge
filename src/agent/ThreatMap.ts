import * as collections from '../util/collections';
import * as traverse from '../util/traverse';
import * as a from './agent.model';
import * as b from '../beliefs';
import * as w from '../model';
import * as AgentHelper from './AgentHelper';
import PathMap from '../util/PathMap';
import Vec from '../util/vector';

export interface Threat {
    enemy: b.Pac;
    arrivalTicks: number;
}

export class ThreatMap {
    private constructor(private beliefs: b.Beliefs, private enemyPathMaps: Map<b.Pac, PathMap>) {
    }

    public static generate(beliefs: b.Beliefs, params: a.AgentParams): ThreatMap {
        const enemyPathMaps = new Map<b.Pac, PathMap>();
        for (const enemy of beliefs.pacs.values()) {
            if (enemy.team === w.Teams.Enemy && enemy.alive && (beliefs.tick - enemy.seenTick) < params.NearbyEnemiesTicks) {
                const pathMap = PathMap.generate(
                    enemy.pos,
                    beliefs,
                    (x, y) => !beliefs.cells[y][x].wall);
                enemyPathMaps.set(enemy, pathMap);
            }
        }

        return new ThreatMap(beliefs, enemyPathMaps);
    }

    public get size() {
        return this.enemyPathMaps.size;
    }

    public threats(pac: b.Pac): Threat[] {
        const threats = new Array<Threat>();

        for (const enemy of this.enemyPathMaps.keys()) {
            const pathMap = this.enemyPathMaps.get(enemy);
            const maxRange = (1 + this.beliefs.tick - pac.seenTick) * AgentHelper.maxMovementSpeed(enemy, this.beliefs);

            // How far away was the enemy last time we saw them, and how far could they have travelled in the time since we last saw them
            const arrivalTicks = Math.max(0, pathMap.cost(pac.pos) - maxRange); 
            threats.push({ enemy, arrivalTicks });
        }

        return threats;
    }
}

export default ThreatMap;