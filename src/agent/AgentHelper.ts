import * as collections from '../util/collections';
import * as traverse from '../util/traverse';
import * as a from './agent.model';
import * as b from '../beliefs';
import * as w from '../model';
import Vec from '../util/vector';

export function discount(value: number, ticks: number, params: a.AgentParams) {
    return value / Math.pow(params.DiscountRate, ticks);
}

export function dominate(form: string) {
    switch (form) {
        case w.Forms.Scissors: return w.Forms.Rock;
        case w.Forms.Paper: return w.Forms.Scissors;
        case w.Forms.Rock: return w.Forms.Paper;
        default: throw `Unknown form: ${form}`;
    }
}

export function maxMovementSpeed(pac: b.Pac, beliefs: b.Beliefs): number {
    if (beliefs.tick < pac.speedUntilTick // Currently speeding
        || (pac.team === w.Teams.Enemy && pac.abilityCooldownUntilTick < beliefs.tick)) { // Or has the ability to speed
        return 2;
    } else {
        return 1;
    }
}

export function pacsToControl(beliefs: b.Beliefs, actions: Map<string, w.Action>): Iterable<b.Pac> {
    return collections.filter(beliefs.pacs.values(), p => p.team === w.Teams.Self && p.alive && !actions.has(p.key))
}