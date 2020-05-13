import * as collections from './collections';
import * as traverse from './traverse';
import Vec from './vector';

const Debug = false;

export type PassableCallback = (pos: Vec) => boolean;

export interface PathLimits {
    maxCost?: number;
}

interface Assignment {
    cost: number;
    from: Vec;
}

export default class PathMap {
    public assignments = 0;

    private constructor(public from: Vec, public bounds: traverse.Dimensions, private pathMap: Assignment[][]) {
    }

    public cost(target: Vec) {
        return this.pathMap[target.y][target.x]?.cost ?? Infinity;
    }

    public pathTo(target: Vec): Vec[] {
        const path = new Array<Vec>();

        if (!this.pathMap[target.y][target.x]) {
            console.error(`Unable to find path to ${target.string()}`);
            return [target];
        }

        let current = target;
        let numIterations = 0;
        while (!current.equals(this.from)) {
            path.unshift(current);

            const next = this.previousNeighbour(current);
            if (!next) {
                break;
            }
            current = next;

            ++numIterations;
            if (Debug && numIterations % 100 === 0) {
                console.error(`Pathfinding ${numIterations}...`);
            }
        }

        if (path.length === 0) {
            // current.equals(target) - just insert a target move anyway
            path.push(target);
        }

        return path;
    }

    public isochrone(targetCost: number): Vec[] {
        const isochrone = new Array<Vec>();
        for (const pos of traverse.all(this.bounds)) {
            const assignment = this.pathMap[pos.y][pos.x];
            if (assignment && assignment.cost == targetCost) {
                isochrone.push(pos);
            }
        }
        return isochrone;
    }

    public isochrones(maxCost: number): Vec[][] {
        const result = new Array<Vec[]>();

        for (const pos of traverse.all(this.bounds)) {
            const assignment = this.pathMap[pos.y][pos.x];
            if (assignment && assignment.cost <= maxCost) {
                const key = Math.floor(assignment.cost);
                let isochrone = result[key];
                if (!isochrone) {
                    result[key] = isochrone = [];
                }

                isochrone.push(pos);
            }
        }

        return result;
    }

    public previousNeighbour(current: Vec) {
        const assignment = this.pathMap[current.y][current.x];
        return assignment?.from;
    }

    public static generate(from: Vec, bounds: traverse.Dimensions, passable: PassableCallback, limits?: PathLimits): PathMap {
        const pathMap = collections.create2D<Assignment>(bounds.width, bounds.height, null);
        const result = new PathMap(from, bounds, pathMap);
        
        if (traverse.withinBounds(from, bounds)) {
            const initial = new Neighbour(from, 0);
            result.assign(initial, null);

            const maxCost = limits?.maxCost ?? Infinity;
            let numIterations = 0;
            const neighbours = [initial];
            while (neighbours.length > 0) {
                const neighbour = neighbours.shift();
                if (neighbour.cost >= maxCost) { break; }

                result.expand(neighbour, passable, neighbours);

                ++numIterations;
                if (Debug && numIterations % 100 === 0) {
                    console.error(`Pathmapping ${numIterations}, neighbours=${neighbours.length}...`);
                }
            }
        } else {
            // Probably a dead robot
        }

        return result;
    }

    private assign(neighbour: Neighbour, from: Vec) {
        const pos = neighbour.pos;
        const cost = neighbour.cost;

        const previous = this.pathMap[pos.y][pos.x];
        if (!previous || cost < previous.cost) {
            this.pathMap[pos.y][pos.x] = { cost, from };
            ++this.assignments;
        }
    }

    private expand(from: Neighbour, passable: PassableCallback, neighbours: Neighbour[]) {
        const pos = from.pos;
        const cost = from.cost;

        if (this.cost(pos) < cost) {
            // This neighbour has been superceded now
            return;
        }

        for (const n of traverse.neighbours(pos, this.bounds)) {
            if (!passable(n)) {
                continue;
            }

            let next = cost + 1;
            if (next < this.cost(n)) {
                const neighbour = new Neighbour(n, next);
                this.assign(neighbour, from.pos);
                this.insertNeighbour(neighbour, neighbours);
            }
        }
    }

    private insertNeighbour(toInsert: Neighbour, neighbours: Neighbour[]) {
        let i = this.findInsertionPosition(toInsert, neighbours);
        if (i < neighbours.length) {
            neighbours.splice(i, 0, toInsert);
        } else {
            neighbours.push(toInsert);
        }
    }

    private findInsertionPosition(toInsert: Neighbour, neighbours: Neighbour[]) {
        if (neighbours.length === 0) {
            return 0;
        } else if (toInsert.cost <= neighbours[0].cost) {
            return 0;
        } else if (toInsert.cost >= neighbours[neighbours.length - 1].cost) {
            return neighbours.length;
        } else {
            return this.binarySearchInsertionPosition(toInsert, neighbours, 0, neighbours.length - 1);
        }
    }

    private binarySearchInsertionPosition(toInsert: Neighbour, neighbours: Neighbour[], lower: number, upper: number): number {
        if (upper >= lower) {
            return lower;
        }

        const mid = Math.floor((lower + upper) / 2);
        const midCost = neighbours[mid].cost;
        if (toInsert.cost === midCost) {
            return mid;
        } else if (toInsert.cost < midCost) {
            return this.binarySearchInsertionPosition(toInsert, neighbours, lower, mid);
        } else {
            return this.binarySearchInsertionPosition(toInsert, neighbours, mid + 1, upper);
        }
    }
}

class Neighbour {
    constructor(public pos: Vec, public cost: number) {
    }
}