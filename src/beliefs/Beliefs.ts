import * as collections from '../util/collections';
import * as traverse from '../util/traverse';
import * as w from '../model';
import Cell from './Cell';
import Pac from './Pac';
import Team from './Team';
import Vec from '../util/vector';

export class Beliefs {
    public tick: number;

    public width: number;
    public height: number;

    public cells: Cell[][];
    public pacs: Map<string, Pac>;
    public teams: Team[];

    constructor(view: w.View) {
        this.tick = view.tick;
        this.width = view.width;
        this.height = view.height;
        this.cells = Cell.initializeCells(view);
        this.pacs = Pac.initializePacs(view);
        this.teams = Team.initializeTeams(view);
    }

    update(view: w.View) {
        this.tick = view.tick;
        Team.update(view, this.teams);
        Pac.update(view, this.pacs);
        Cell.update(view, this.cells);
    }
}

export default Beliefs;
