import * as collections from '../util/collections';
import * as traverse from '../util/traverse';
import * as a from './agent.model';
import * as b from '../beliefs';
import * as w from '../model';
import * as AgentHelper from './AgentHelper';
import PathMap, { PassableCallback } from '../util/PathMap';
import Vec from '../util/vector';

interface Occupant {
    wall?: boolean;
    pac?: string;
    team?: number;
    dominateWith?: string;
    drawWith?: string;
}

interface PathMapCacheItem { // Treat as immutable
    pathMap: PathMap;
    nowNotPassable: Vec[];
}

export class OccupantMap {
    private pathMapCache = new Map<b.Pac, PathMapCacheItem>();

    private constructor(private beliefs: b.Beliefs, private occupants: Occupant[][], private params: a.AgentParams) {
    }

    public static generate(beliefs: b.Beliefs, params: a.AgentParams): OccupantMap {
        const occupants: Occupant[][] = collections.init2D(
            beliefs.width,
            beliefs.height,
            (x, y) => beliefs.cells[y][x].wall ? OccupantMap.wallOccupant() : null);

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

        return new OccupantMap(beliefs, occupants, params);
    }

    private static wallOccupant(): Occupant {
        return { wall: true };
    }

    private static pacOccupant(pac: b.Pac, beliefs: b.Beliefs): Occupant {
        if (pac.team === w.Teams.Self) {
            return { pac: pac.key, team: pac.team };
        } else {
            let dominateWith: string = null;
            let drawWith: string = null;
            if (beliefs.tick < pac.abilityCooldownUntilTick) {
                // Enemy is unable to change at the last second
                dominateWith = AgentHelper.dominate(pac.form);
                drawWith = pac.form;
            }
            return { pac: pac.key, team: pac.team, dominateWith, drawWith };
        }
    }

    clone() {
        const clone = new OccupantMap(this.beliefs, collections.clone2D(this.occupants), this.params);
        clone.pathMapCache = new Map(this.pathMapCache);
        return clone;
    }

    precompute(pacs: Iterable<b.Pac>) {
        // Precompute the pathMap for each pac so that all future pathfindings can be incremental
        for (const pac of pacs) {
            this.pathfind(pac);
        }
    }

    pathfind(pac: b.Pac) {
        const passable: PassableCallback = (x, y) => this.passable(x, y, pac);
        const cacheItem = this.pathMapCache.get(pac);

        let pathMap: PathMap;
        if (cacheItem) {
            if (cacheItem.nowNotPassable.length === 0) {
                pathMap = cacheItem.pathMap;
            } else {
                pathMap = cacheItem.pathMap.reevaluate(passable, {
                    nowPassable: [],
                    nowNotPassable: cacheItem.nowNotPassable,
                });
            }
        } else {
            pathMap = PathMap.generate(pac.pos, this.beliefs, passable);
        }
        this.pathMapCache.set(pac, {
            pathMap,
            nowNotPassable: [],
        });
        return pathMap;
    }

    block(pos: Vec, pac: b.Pac) {
        this.occupants[pos.y][pos.x] = OccupantMap.pacOccupant(pac, this.beliefs);

        for (const key of this.pathMapCache.keys()) {
            const cacheItem = this.pathMapCache.get(key);
            this.pathMapCache.set(key, {
                ...cacheItem,
                nowNotPassable: [...cacheItem.nowNotPassable, pos.clone()],
            });
        }
    }

    private passable(x: number, y: number, pac: b.Pac): boolean {
        const occupant = this.occupants[y][x];
        if (!occupant) {
            return true;
        } else if (occupant.pac === pac.key) {
            return true;
        } else if (occupant.team === w.Teams.Self && Vec.l1(pac.pos, new Vec(x, y)) >= this.params.IgnoreRange) {
            // Ignore own pacs if they are far away enough
            return true;
        } else if (occupant.dominateWith === pac.form || occupant.drawWith === pac.form) {
            return true;
        } else {
            return false;
        }
    }
}

export default OccupantMap;