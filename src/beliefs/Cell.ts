import * as collections from '../util/collections';
import * as traverse from '../util/traverse'
import * as w from '../model';
import Pac from './Pac';
import Vec from '../util/vector';

export class Cell {
    public value = 0;
    public seenTick = 0;
    public wall = false;

    constructor(public pos: Vec) {
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
        // Update what we can see
        for (const pac of view.pacs) {
            if (pac.team !== w.Teams.Self) { continue; }

            for (const heading of traverse.headings()) {
                for (const pos of traverse.ray(view, pac.pos, heading)) {
                    if (view.map[pos.y][pos.x] === w.Tiles.Wall) { break; }
                    cells[pos.y][pos.x].seen(view.tick, 0);
                }
            }
        }

        // Update what we cannot see
        for (const pellet of view.pellets) {
            cells[pellet.pos.y][pellet.pos.x].seen(view.tick, pellet.value);
        }
    }

    private seen(tick: number, pellet: number) {
        this.value = pellet;
        this.seenTick = tick;
    }
}

export default Cell;