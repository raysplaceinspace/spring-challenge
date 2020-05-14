import * as collections from '../util/collections';
import * as traverse from '../util/traverse';
import * as w from '../model';
import Cell from './Cell';
import Pac from './Pac';
import PathMap from '../util/PathMap';
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

    update(view: w.View, start = Date.now()) {
        this.tick = view.tick;
        Team.update(view, this.teams);
        Pac.update(view, this.pacs);
        Cell.update(view, this.cells);
        this.updateProbabilities(start);
    }

    private updateProbabilities(start = Date.now()) {
        let numEnemies = 0;
        let numUpdates = 0;
        for (const enemy of this.pacs.values()) {
            if (!(enemy.alive && enemy.team === w.Teams.Enemy)) {
                continue;
            }
            ++numEnemies;

            const seenAge = this.tick - enemy.seenTick;
            const pathMap = PathMap.generate(enemy.pos, this, (x, y) => !this.cells[y][x].wall, {
                maxCost: seenAge,
            });

            const forwardMap = pathMap.forward();
            numUpdates += this.updateProbabilityFrom(enemy.pos, forwardMap, 1.0, enemy.seenTick);
        }

        const elapsed = Date.now() - start;
        console.error(`Updated pellet beliefs for ${numUpdates} cells from ${numEnemies} enemies in ${elapsed} ms`);
    }

    private updateProbabilityFrom(pos: Vec, forwardMap: Array<Vec>[][], reachProbability: number, reachTick: number): number {
        let numUpdates = 0;

        const cell = this.cells[pos.y][pos.x];
        const seenTick = cell.seenTick;
        if (seenTick < reachTick) { // If we have seen the cell after the enemy could have arrived, then we already know the truth
            const takenProbability = 1 - reachProbability;
            if (takenProbability < cell.probability) {
                this.cells[pos.y][pos.x].probability = takenProbability;
                ++numUpdates;
            }
        }

        const allNext = forwardMap[pos.y][pos.x];
        const nextProbability = reachProbability / allNext.length;
        for (const next of allNext) {
            numUpdates += this.updateProbabilityFrom(next, forwardMap, nextProbability, reachTick + 1);
        }

        return numUpdates;
    }
}

export default Beliefs;
