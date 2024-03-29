import * as collections from './collections';
import * as traverse from './traverse';
import Vec from './vector';

const Debug = false;
const DebugIterations = false;

export type PassableCallback = (x: number, y: number) => boolean;

export interface PathLimits {
    maxCost?: number;
}

export interface PathMapDelta {
    nowPassable: Vec[];
    nowNotPassable: Vec[];
}

export default class PathMap {
    public assignments = 0;
    private pathMap: Cell[][];
    private forwardMap: Array<Vec>[][];

    private constructor(public from: Vec, public bounds: traverse.Dimensions, private passable: PassableCallback, private limits: PathLimits) {
        this.pathMap = collections.create2D<Cell>(bounds.width, bounds.height, null);
    }

    public cost(target: Vec, impassable = false) {
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
            if (Debug && DebugIterations && numIterations % 100 === 0) {
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

    public static generate(from: Vec, bounds: traverse.Dimensions, passable: PassableCallback, limits: PathLimits = {}): PathMap {
        const start = Date.now();

        const pathMap = new PathMap(from, bounds, passable, limits);
        
        if (traverse.withinBounds(from, bounds)) {
            const initial = new Cell(from, null, 0);
            const numIterations = pathMap.expandAll([initial]);

            if (Debug) {
                const elapsed = Date.now() - start;
                console.error(`Evaluated pathmap in ${elapsed} ms: numIterations=${numIterations}`);
            }
        }

        return pathMap;
    }

    public forward(): Array<Vec>[][] {
        if (this.forwardMap) {
            return this.forwardMap;
        }

        const bounds = this.bounds;
        const forwardMap = collections.init2D(bounds.width, bounds.height, () => new Array<Vec>());
        for (const n of traverse.all(bounds)) {
            const previous = this.previousNeighbour(n);
            if (previous) {
                forwardMap[previous.y][previous.x].push(n);
            }
        }

        this.forwardMap = forwardMap;
        return forwardMap;
    }

    public reevaluate(passable: PassableCallback, delta: PathMapDelta): PathMap {
        const start = Date.now();

        const bounds = this.bounds;
        const clone = new PathMap(this.from, bounds, passable, this.limits);

        const cellsMadePassable = delta.nowPassable;
        const cellsMadeNotPassable = delta.nowNotPassable;

        // If a cell has been made passable, need to recompute everything beyond that range
        const maxCost = Math.max(1, collections.min(cellsMadePassable.map(n => this.cost(n))) ?? Infinity);
        for (const n of traverse.all(bounds)) {
            const cell = this.pathMap[n.y][n.x];
            if (cell && cell.cost < maxCost) {
                clone.pathMap[n.y][n.x] = cell;
            }
        }

        // If a cell has been made impassable, clear everything that went through that cell
        if (cellsMadeNotPassable.length > 0) {
            clone.clearBeyondAll(cellsMadeNotPassable);
        }

        // Recalculate, if something has changed
        let numIterations = 0;
        if (cellsMadePassable.length > 0 || cellsMadeNotPassable.length > 0) {
            const initial = new Array<Cell>();
            for (const n of traverse.all(bounds)) {
                const cell = clone.pathMap[n.y][n.x];
                if (cell) {
                    initial.push(cell);
                }
            }
            numIterations = clone.expandAll(initial);
        }

        if (Debug) {
            const elapsed = Date.now() - start;
            console.error(`Revaluated pathmap in ${elapsed} ms: numIterations=${numIterations} cellsMadePassable=${cellsMadePassable.length} cellsMadeNotPassable=${cellsMadeNotPassable.length}`);
        }

        return clone;
    }

    private clearBeyondAll(cells: Iterable<Vec>) {
        const forwardMap = this.forward();
        for (const cell of cells) {
            this.clearBeyond(cell, forwardMap);
        }
    }

    private clearBeyond(pos: Vec, forwardMap: Array<Vec>[][]) {
        this.pathMap[pos.y][pos.x] = null;

        const allNext = forwardMap[pos.y][pos.x];
        for (const next of allNext) {
            this.clearBeyond(next, forwardMap);
        }
    }

    private expandAll(initial: Cell[]) {
        const queue = new NeighbourQueue();
        for (const cell of initial) {
            this.assign(cell);
            queue.insert(cell);
        }

        const maxCost = this.limits.maxCost ?? Infinity;
        let numIterations = 0;
        while (queue.length > 0) {
            const neighbour = queue.shift();
            if (neighbour.cost >= maxCost) { break; }

            this.expand(neighbour, queue);

            ++numIterations;
            if (Debug && DebugIterations && numIterations % 100 === 0) {
                console.error(`Pathmapping ${numIterations}, neighbours=${queue.length}...`);
            }
        }

        return numIterations;
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

    private expand(from: Cell, neighbours: NeighbourQueue) {
        const pos = from.pos;
        const cost = from.cost;

        if (this.cost(pos) < cost) {
            // This neighbour has been superceded now
            return;
        }

        for (const n of traverse.neighbours(pos, this.bounds)) {
            if (!this.passable(n.x, n.y)) {
                continue;
            }

            let next = cost + 1;
            if (next < this.cost(n)) {
                const neighbour = new Cell(n, from.pos, next);
                this.assign(neighbour);
                neighbours.insert(neighbour);
            }
        }
    }
}

class NeighbourQueue {
    private items = new Array<Cell>();

    public get length() {
        return this.items.length;
    }

    public shift() {
        return this.items.shift();
    }

    insert(toInsert: Cell) {
        const neighbours = this.items;
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