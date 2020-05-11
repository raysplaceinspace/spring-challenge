import * as w from '../model';
import Agent from '../agent';
import Beliefs from '../beliefs';
import Vec from '../util/vector';

export function testAgent() {
    const initialMap: string[] = [
        "# #",
        "# #",
        "   ",
        "# #",
        "# #",
    ];
    const initial: w.View = w.initialView(initialMap[0].length, initialMap.length, initialMap);
    const beliefs = new Beliefs(initial);
    const agent = new Agent(initial);

    const next = w.clone(initial);
    next.pacs.push({
        id: 0,
        team: w.Teams.Self,
        pos: new Vec(2, 2),
        type: w.Forms.Rock,
        speedTurnsLeft: 1,
        abilityCooldown: 0,
    });
    next.pellets.push({
        pos: new Vec(0, 2),
        value: 1,
    });

    beliefs.update(next);
    const actions = agent.choose(next, beliefs);

    if (actions.length < 1) {
        throw "No action";
    }
}