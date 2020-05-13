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

    update(view: w.View) {
        this.tick = view.tick;
        Team.update(view, this.teams);
        Pac.update(view, this.pacs);
        Cell.update(view, this.cells);
        this.updateStillAvailableProbabilities();
    }

    private updateStillAvailableProbabilities() {
        let numUpdates = 0;
        for (const enemy of this.pacs.values()) {
            if (!(enemy.alive && enemy.team === w.Teams.Enemy)) {
                continue;
            }

            const seenAge = this.tick - enemy.seenTick;
            const pathMap = PathMap.generate(enemy.pos, this, p => !this.cells[p.y][p.x].wall);
            const isochrones = pathMap.isochrones(seenAge);

            let maxNumCells = 1;
            for (let range = 0; range < isochrones.length; ++range) {
                const isochrone = isochrones[range];
                if (!isochrone) { continue; }

                const numCells = isochrone.length;
                if (numCells > maxNumCells) {
                    maxNumCells = numCells;
                }
            }

            // Decrease the probability that there is still a pellet at every cell that the enemy could have reached this turn
            const isochrone = isochrones[seenAge];
            if (isochrone) {
                const range = seenAge;
                const visitProbability = 1.0 / maxNumCells;
                const arrivalTick = enemy.seenTick + range;
                for (const pos of isochrone) {
                    const seenTick = this.cells[pos.y][pos.x].seenTick;
                    if (seenTick < arrivalTick) { // If we have seen the cell after the enemy could have arrived, then we already know the truth
                        const stillAvailableProbability = 1 - visitProbability;
                        if (stillAvailableProbability < this.cells[pos.y][pos.x].stillAvailableProbability) {
                            this.cells[pos.y][pos.x].stillAvailableProbability = stillAvailableProbability;
                            ++numUpdates;
                        }
                    }
                }
            }
        }

        if (numUpdates > 0) {
            console.error(`Updated stillAvailableProbability for ${numUpdates} cells`);
        }
    }
}

export default Beliefs;
