import * as collections from '../util/collections';
import * as traverse from '../util/traverse';
import * as w from '../model';
import Cell from './Cell';
import Vec from '../util/vector';

export class Beliefs {
    public cells: Cell[][];

    constructor(view: w.View) {
        this.cells = Beliefs.initializeCells(view);
    }

    private static initializeCells(view: w.View): Cell[][] {
        return collections.init2D(
            view.width,
            view.height,
            (x, y) => Cell.init(view, x, y));
    }

    update(view: w.View) {
    }
}

export default Beliefs;
