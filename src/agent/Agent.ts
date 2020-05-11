import * as collections from '../util/collections';
import * as traverse from '../util/traverse';
import * as a from './agent.model';
import * as b from '../beliefs';
import * as w from '../model';
import Actor from './Actor';
import PathMap from '../util/PathMap';
import Vec from '../util/vector';

export class Agent {
    constructor(view: w.View, public params: a.AgentParams = a.defaultParams()) {
    }

    choose(view: w.View, beliefs: b.Beliefs): w.Action[] {
        const actor = new Actor(view, beliefs, this.params);
        return actor.choose();
    }
}

export default Agent;