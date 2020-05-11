import * as angles from '../util/angles';
import * as w from '../model';
import Agent from '../agent';
import Beliefs from '../beliefs/Beliefs';
import Vec from '../util/vector';

function readInitial(): w.View {
    const inputs = readline().split(' ');
    const width = parseInt(inputs[0]); // size of the grid
    const height = parseInt(inputs[1]); // top left corner is (x=0, y=0)

    const rows = new Array<string>();
    for (let i = 0; i < height; i++) {
        const row = readline(); // one line of the grid: space " " is floor, pound "#" is wall
        rows.push(row);
    }

    return w.initialView(width, height, rows);
}

function readNext(view: w.View) {
    {
        const inputs = readline().split(' ');
        const myScore = parseInt(inputs[0]);
        const opponentScore = parseInt(inputs[1]);
        view.scores = [myScore, opponentScore];
    }

    const visiblePacCount = parseInt(readline()); // all your pacs and enemy pacs in sight
    for (let i = 0; i < visiblePacCount; i++) {
        var inputs = readline().split(' ');
        const id = parseInt(inputs[0]); // pac number (unique within a team)
        const mine = inputs[1] !== '0'; // true if this pac is yours
        const x = parseInt(inputs[2]); // position in the grid
        const y = parseInt(inputs[3]); // position in the grid
        const type = inputs[4]; // unused in wood leagues
        const speedTurnsLeft = parseInt(inputs[5]); // unused in wood leagues
        const abilityCooldown = parseInt(inputs[6]); // unused in wood leagues
        view.pacs.push({
            id,
            team: mine ? w.Teams.Self : w.Teams.Enemy,
            pos: new Vec(x, y),
            type,
            speedTurnsLeft,
            abilityCooldown,
        });
    }
    const visiblePelletCount = parseInt(readline()); // all pellets in sight
    for (let i = 0; i < visiblePelletCount; i++) {
        var inputs = readline().split(' ');
        const x = parseInt(inputs[0]);
        const y = parseInt(inputs[1]);
        const value = parseInt(inputs[2]); // amount of points this pellet is worth
        view.pellets.push({
            pos: new Vec(x, y),
            value,
        });
    }

}

function formatAction(action: w.Action) {
    let str = formatActionIntent(action);
    if (action.tag) {
        str += " " + action.tag;
    }
    return str;
}

function formatActionIntent(action: w.Action) {
    switch (action.type) {
        case "wait": return `WAIT ${action.pac}`;
        case "move": return `MOVE ${action.pac} ${action.target.x} ${action.target.y}`;
        case "switch": return `SWITCH ${action.pac} ${action.form}`;
        case "speed": return `SPEED ${action.pac}`;
        default: return "NULL";
    }
}

function main() {
    try {
        // initialisation
        const initial = readInitial();
        const agent = new Agent(initial);
        const beliefs = new Beliefs(initial);

        // game loop
        let tick = 0;
        while (true) {
            const next = w.clone(initial);
            next.tick = tick;
            readNext(next);

            beliefs.update(next);
            const actions = agent.choose(beliefs);
            console.log(actions.map(formatAction).join(' | '));

            tick++;
        }
    } catch(exception) {
        console.error(exception);
    }
}

main();