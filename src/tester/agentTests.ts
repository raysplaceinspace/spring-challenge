import * as w from '../model';
import Agent from '../agent';
import Beliefs from '../beliefs';
import Vec from '../util/vector';

export function testAgent() {
    const initialMap: string[] = [
        "# # # #",
        "# # # #",
        "       ",
        "# # # #",
        "# # # #",
    ];
    const initial: w.View = w.initialView(initialMap[0].length, initialMap.length, initialMap);
    const beliefs = new Beliefs(initial);
    const agent = new Agent(initial);

    let next = w.clone(initial);
    next.pacs.push({
        id: 0,
        team: w.Teams.Self,
        pos: new Vec(2, 1),
        type: w.Forms.Rock,
        speedTurnsLeft: 0,
        abilityCooldown: 0,
    });
    next.pellets.push({
        pos: new Vec(2, 3),
        value: 1,
    });
    tick(next, agent, beliefs);

    next = w.clone(next);
    next.tick++;
    next.pacs[0].abilityCooldown = 10;

    tick(next, agent, beliefs);
}

function tick(next: w.View, agent: Agent, beliefs: Beliefs) {
    beliefs.update(next);
    const actions = agent.choose(next, beliefs);

    if (actions.length < 1) {
        throw "No action";
    }

    for (const action of actions) {
        console.log(JSON.stringify(action));
    }
}