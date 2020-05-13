import * as collections from '../util/collections';
import * as traverse from '../util/traverse';
import * as a from './agent.model';
import * as b from '../beliefs';
import * as w from '../model';
import * as AgentHelper from './AgentHelper';
import Vec from '../util/vector';

export class WaitActor {
    constructor(
        public view: w.View,
        public beliefs: b.Beliefs,
        public params: a.AgentParams) {
    }

    choose(actions: Map<string, w.Action>) {
        const beliefs = this.beliefs;
        for (const pac of AgentHelper.pacsToControl(beliefs, actions)) {
            const action: w.WaitAction = { pac: pac.id, type: "wait" };
            actions.set(pac.key, action);
        }
    }
}

export default WaitActor;