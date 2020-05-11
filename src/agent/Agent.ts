import * as collections from '../util/collections';
import * as traverse from '../util/traverse';
import * as w from '../model';
import Beliefs from '../beliefs/Beliefs';
import Vec from '../util/vector';

export default class Agent {
    constructor(view: w.View) {
    }

    choose(view: w.View, beliefs: Beliefs): w.Action[] {
        const pellets = new Set<Vec>(this.findPellets(view, beliefs));

        const actions = new Array<w.Action>();
        for (const pac of view.pacs) {
            if (pac.team === w.Teams.Self) {
                const closest = collections.minBy(pellets, pellet => Vec.distance(pac.pos, pellet));
                if (closest) {
                    pellets.delete(closest); // Only one pac can target a particular pellet at a time
                    actions.push({ pac: pac.id, type: "move", target: closest });
                } else {
                    actions.push({ pac: pac.id, type: "wait" });
                }
            }
        }
        return actions;
    }

    private* findPellets(view: w.View, beliefs: Beliefs): Iterable<Vec> {
        for (const pos of traverse.all(view)) {
            if (beliefs.cells[pos.y][pos.x].pellet > 0) {
                yield pos;
            }
        }
    }
}
