import * as collections from '../util/collections';
import * as traverse from '../util/traverse'
import * as w from '../model';
import Pac from './Pac';
import Vec from '../util/vector';

export class Cell {
    public value = 0;
    public seenTick = 0;
    public wall = false;
    public probability = 1; // Probability the value is still available and has not yet been taken by an enemy

    constructor(public pos: Vec) {
    }

    expectedValue() {
        return this.value * this.probability;
    }

    static initializeCells(view: w.View): Cell[][] {
        return collections.init2D(
            view.width,
            view.height,
            (x, y) => Cell.init(view, x, y));
    }

    private static init(view: w.View, x: number, y: number): Cell {
        const cell = new Cell(new Vec(x, y));
        cell.value = view.map[y][x] === w.Tiles.Blank ? 1 : 0;
        cell.seenTick = view.tick;
        cell.wall = view.map[y][x] === w.Tiles.Wall;
        return cell;
    }

    static update(view: w.View, cells: Cell[][]) {
        // Update what we can see from our pacs
        for (const pac of view.pacs) {
            if (pac.team !== w.Teams.Self) { continue; }

            for (const heading of traverse.headings()) {
                for (const pos of traverse.ray(view, pac.pos, heading)) {
                    if (view.map[pos.y][pos.x] === w.Tiles.Wall) { break; }
                    cells[pos.y][pos.x].seen(view.tick, 0);
                }
            }
        }
        for (const pellet of view.pellets) {
            cells[pellet.pos.y][pellet.pos.x].seen(view.tick, pellet.value);
        }

        // When super pellets disappear, we know that for sure
        for (const pos of traverse.all(view)) {
            const cell = cells[pos.y][pos.x];
            if (cell.value > 1 // Super pellet
                && cell.seenTick < view.tick) { // Not seen this tick
                
                cell.seen(view.tick, 0);
                console.error(`Super pellet ${pos.string()} taken`);
            }
        }
    }

    private seen(tick: number, pellet: number) {
        this.value = pellet;
        this.seenTick = tick;
        this.probability = 1;
    }
}

export default Cell;