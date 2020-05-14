import * as collections from '../util/collections';
import * as traverse from '../util/traverse';
import * as a from './agent.model';
import * as b from '../beliefs';
import * as w from '../model';
import * as AgentHelper from './AgentHelper';
import PathMap from '../util/PathMap';
import Vec from '../util/vector';
import OccupantMap from './OccupantMap';

export interface Threat {
    enemy: b.Pac;
    arrivalTicks: number;
}

export class ThreatMap {
    private constructor(private beliefs: b.Beliefs, private enemies: b.Pac[], private occupantMap: OccupantMap) {
    }

    public static generate(beliefs: b.Beliefs, occupantMap: OccupantMap, params: a.AgentParams): ThreatMap {
        const enemies = new Array<b.Pac>();
        for (const enemy of beliefs.pacs.values()) {
            if (enemy.team === w.Teams.Enemy && enemy.alive && (beliefs.tick - enemy.seenTick) < params.NearbyEnemiesTicks) {
                enemies.push(enemy);
            }
        }

        return new ThreatMap(beliefs, enemies, occupantMap);
    }

    public get size() {
        return this.enemies.length;
    }

    public threats(pac: b.Pac): Threat[] {
        const threats = new Array<Threat>();

        const pathMap = this.occupantMap.pathfind(pac);
        for (const enemy of this.enemies) {
            // How far the enemy could have travelled since we last saw them
            const maxRange = (1 + this.beliefs.tick - enemy.seenTick) * AgentHelper.maxMovementSpeed(enemy, this.beliefs);

            // How long it will take for the enemy to reach us
            const arrivalTicks = Math.max(0, this.costToEnemy(enemy, pathMap) - maxRange);
            threats.push({ enemy, arrivalTicks });
        }

        return threats;
    }

    private costToEnemy(enemy: b.Pac, pathMap: PathMap) {
        // Enemies are impassable normally, so cannot path to them, but can path to their neighbours
        const target = enemy.pos;
        let cost = pathMap.cost(target);
        if (cost === Infinity) {
            for (const n of traverse.neighbours(target, this.beliefs)) {
                let subcost = pathMap.cost(n);
                if (subcost < Infinity) {
                    cost = Math.min(cost, subcost + 1);
                }
            }
        }
        return cost;
    }
}

export default ThreatMap;