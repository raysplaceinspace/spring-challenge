import * as collections from './collections';
import * as traverse from './traverse';
import Vec from './vector';

const Debug = false;

export type PassableCallback = (x: number, y: number) => boolean;

export interface PathLimits {
    maxCost?: number;
}

export default class PathMap {
    public assignments = 0;
    private pathMap: Cell[][];

    private constructor(public from: Vec, public bounds: traverse.Dimensions, private passable: boolean[][]) {
        this.pathMap = collections.create2D<Cell>(bounds.width, bounds.height, null);
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
        const passableMap = collections.init2D(bounds.width, bounds.height, (x, y) => passable(x, y));
        const pathMap = new PathMap(from, bounds, passableMap);
        
        if (traverse.withinBounds(from, bounds)) {
            const initial = new Cell(from, null, 0);
            pathMap.expandAll([initial], limits);
        }

        return pathMap;
    }

    private expandAll(initial: Cell[], limits?: PathLimits) {
        for (const cell of initial) {
            this.assign(cell);
        }

        const maxCost = limits?.maxCost ?? Infinity;
        let numIterations = 0;
        const neighbours = [...initial];
        while (neighbours.length > 0) {
            const neighbour = neighbours.shift();
            if (neighbour.cost >= maxCost) { break; }

            this.expand(neighbour, neighbours);

            ++numIterations;
            if (Debug && numIterations % 100 === 0) {
                console.error(`Pathmapping ${numIterations}, neighbours=${neighbours.length}...`);
            }
        }
    }

    private assign(neighbour: Cell) {
        const pos = neighbour.pos;
        const cost = neighbour.cost;

        const previous = this.pathMap[pos.y][pos.x];
        if (!previous || cost < previous.cost) {
            this.pathMap[pos.y][pos.x] = neighbour;
            ++this.assignments;
        }
    }

    private expand(from: Cell, neighbours: Cell[]) {
        const pos = from.pos;
        const cost = from.cost;

        if (this.cost(pos) < cost) {
            // This neighbour has been superceded now
            return;
        }

        for (const n of traverse.neighbours(pos, this.bounds)) {
            if (!this.passable[n.y][n.x]) {
                continue;
            }

            let next = cost + 1;
            if (next < this.cost(n)) {
                const neighbour = new Cell(n, from.pos, next);
                this.assign(neighbour);
                this.insertNeighbour(neighbour, neighbours);
            }
        }
    }

    private insertNeighbour(toInsert: Cell, neighbours: Cell[]) {
        let i = this.findInsertionPosition(toInsert, neighbours);
        if (i < neighbours.length) {
            neighbours.splice(i, 0, toInsert);
        } else {
            neighbours.push(toInsert);
        }
    }

    private findInsertionPosition(toInsert: Cell, neighbours: Cell[]) {
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

    private binarySearchInsertionPosition(toInsert: Cell, neighbours: Cell[], lower: number, upper: number): number {
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

class Cell {
    constructor(public pos: Vec, public from: Vec, public cost: number) {
    }
}