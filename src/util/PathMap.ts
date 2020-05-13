import * as collections from './collections';
import * as traverse from './traverse';
import Vec from './vector';

const Debug = false;

export type PassableCallback = (pos: Vec) => boolean;

export default class PathMap {
    public assignments = 0;
    public expansions = new Set<number>();

    private constructor(public from: Vec, public bounds: traverse.Dimensions, private pathMap: number[][]) {
    }

    public cost(target: Vec) {
        return this.pathMap[target.y][target.x];
    }

    public pathTo(target: Vec): Vec[] {
        const path = new Array<Vec>();

        if (this.pathMap[target.y][target.x] === Infinity) {
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
            const cost = this.pathMap[pos.y][pos.x];
            if (cost == targetCost) {
                isochrone.push(pos);
            }
        }
        return isochrone;
    }

    public isochrones(maxCost: number): Vec[][] {
        const result = new Array<Vec[]>();

        for (const pos of traverse.all(this.bounds)) {
            const cost = this.pathMap[pos.y][pos.x];
            if (cost <= maxCost) {
                const key = Math.floor(cost);
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
        let best: Vec = null;
        let bestCost: number = this.pathMap[current.y][current.x];
        for (const n of traverse.neighbours(current, this.bounds)) {
            const cost = this.pathMap[n.y][n.x];
            if (!best || cost < bestCost) {
                best = n;
                bestCost = cost;
            }
        }
        return best;
    }

    public static generate(from: Vec, bounds: traverse.Dimensions, passable: PassableCallback): PathMap {
        const pathMap = collections.create2D<number>(bounds.width, bounds.height, Infinity);
        const result = new PathMap(from, bounds, pathMap);
        
        if (traverse.withinBounds(from, bounds)) {
            const initial = new Neighbour(from, 0);
            result.assign(initial);

            let numIterations = 0;
            const neighbours = [initial];
            while (neighbours.length > 0) {
                const neighbour = neighbours.shift();
                result.expand(neighbour, passable, neighbours);

                ++numIterations;
                if (Debug && numIterations % 100 === 0) {
                    console.error(`Pathmapping ${numIterations}...`);
                }
            }
        } else {
            // Probably a dead robot
        }

        return result;
    }

    private assign(neighbour: Neighbour) {
        const pos = neighbour.pos;
        const cost = neighbour.cost;

        const previous = this.pathMap[pos.y][pos.x];
        if (cost < previous) {
            this.pathMap[pos.y][pos.x] = cost;
            ++this.assignments;
        }
    }

    private expand(from: Neighbour, passable: PassableCallback, neighbours: Neighbour[]) {
        const pos = from.pos;
        const cost = from.cost;

        if (this.expansions.has(pos.hash())) {
            // Already expanded
            return;
        } else {
            this.expansions.add(pos.hash());
        }

        for (const n of traverse.neighbours(pos, this.bounds)) {
            if (n.equals(pos) || !passable(n)) {
                continue;
            }

            let next = cost + 1;
            if (next < this.pathMap[n.y][n.x]) {
                const neighbour = new Neighbour(n, next);
                this.assign(neighbour);
                this.insertNeighbour(neighbour, neighbours);
            }
        }
    }

    private insertNeighbour(toInsert: Neighbour, neighbours: Neighbour[]) {
        let i = 0;
        while (i < neighbours.length && neighbours[i].cost < toInsert.cost) {
            ++i;
        }

        if (i < neighbours.length) {
            neighbours.splice(i, 0, toInsert);
        } else {
            neighbours.push(toInsert);
        }
    }
}

class Neighbour {
    constructor(public pos: Vec, public cost: number) {
    }
}