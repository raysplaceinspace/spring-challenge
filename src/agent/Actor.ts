import * as collections from '../util/collections';
import * as traverse from '../util/traverse';
import * as a from './agent.model';
import * as b from '../beliefs';
import * as w from '../model';
import * as AgentHelper from './AgentHelper';
import PathMap from '../util/PathMap';
import Vec from '../util/vector';
import CollectActor from './CollectActor';
import OccupantMap from './OccupantMap';
import ThreatActor from './ThreatActor';
import WaitActor from './WaitActor';


export class Actor {
    constructor(
        public view: w.View,
        public beliefs: b.Beliefs,
        public params: a.AgentParams,
        private start = Date.now()) {
    }

    choose(): w.Action[] {
        const actions = new Map<string, w.Action>();

        const occupantMap = OccupantMap.generate(this.beliefs);
        occupantMap.precompute(collections.filter(this.beliefs.pacs.values(), p => p.team === w.Teams.Self && p.alive)); // Precompute the paths for all my pacs

        const threatActor = new ThreatActor(this.view, this.beliefs, occupantMap, this.params);
        threatActor.choose(actions);

        const collectActor = new CollectActor(this.view, this.beliefs, occupantMap, this.params, this.start);
        collectActor.choose(actions);

        const waitActor = new WaitActor(this.view, this.beliefs, this.params);
        waitActor.choose(actions);

        return collections.toArray(actions.values());
    }
}

export default Actor;