import * as collections from '../util/collections';
import * as traverse from '../util/traverse';
import * as a from './agent.model';
import * as b from '../beliefs';
import * as w from '../model';
import * as AgentHelper from './AgentHelper';
import PathMap from '../util/PathMap';
import Vec from '../util/vector';

interface Occupant {
    wall?: boolean;
    pac?: string;
    dominateWith?: string;
}

export class OccupantMap {
    private constructor(private beliefs: b.Beliefs, private occupants: Occupant[][]) {
    }

    public static generate(beliefs: b.Beliefs): OccupantMap {
        const occupants: Occupant[][] = collections.init2D(
            beliefs.width,
            beliefs.height,
            (x, y) => beliefs.cells[y][x].wall ? { wall: true } : null);

        // Occupying pacs
        for (const pac of beliefs.pacs.values()) {
            if (!(pac.seenTick === beliefs.tick && pac.alive)) {
                continue;
            }

            occupants[pac.pos.y][pac.pos.x] = this.pacOccupant(pac, beliefs);
        }

        // Identify collisions with enemy in the next turn and avoid
        const selfLocations = new Set<number>();
        for (const pac of beliefs.pacs.values()) {
            if (pac.team === w.Teams.Self && pac.alive && pac.seenTick === beliefs.tick) {
                const maxMovementSpeed = AgentHelper.maxMovementSpeed(pac, beliefs);
                for (const n of traverse.untilRange(pac.pos, maxMovementSpeed, beliefs)) {
                    // Detect all locations this pac could move to
                    selfLocations.add(n.hash());
                }
            }
        }
        for (const enemy of beliefs.pacs.values()) {
            if (enemy.team === w.Teams.Enemy && enemy.alive && enemy.seenTick === beliefs.tick) {
                for (const n of traverse.neighbours(enemy.pos, beliefs)) {
                    if (selfLocations.has(n.hash()) && !occupants[n.y][n.x]) {
                        // Detected the enemy could move to the same square as us
                        occupants[n.y][n.x] = this.pacOccupant(enemy, beliefs);
                    }
                }
            }
        }

        return new OccupantMap(beliefs, occupants);
    }

    private static pacOccupant(pac: b.Pac, beliefs: b.Beliefs): Occupant {
        if (pac.team === w.Teams.Self) {
            return { pac: pac.key };
        } else {
            let dominateWith: string = null;
            if (beliefs.tick < pac.abilityCooldownUntilTick) {
                // Enemy is unable to change at the last second
                dominateWith = AgentHelper.dominate(pac.form);
            }
            return { pac: pac.key, dominateWith };
        }
    }

    clone() {
        return new OccupantMap(this.beliefs, collections.clone2D(this.occupants));
    }

    pathfind(pac: b.Pac) {
        return PathMap.generate(
            pac.pos,
            this.beliefs,
            (pos) => this.passable(pos, pac));
    }

    block(pos: Vec, pac: b.Pac) {
        this.occupants[pos.y][pos.x] = OccupantMap.pacOccupant(pac, this.beliefs);
    }

    private passable(pos: Vec, pac: b.Pac): boolean {
        const occupant = this.occupants[pos.y][pos.x];
        if (!occupant) {
            return true;
        }

        if (occupant.pac === pac.key) {
            return true;
        }

        if (occupant.dominateWith === pac.form) {
            return true;
        }

        return false;
    }
}

export default OccupantMap;