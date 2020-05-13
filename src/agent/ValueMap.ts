import * as collections from '../util/collections';
import * as traverse from '../util/traverse';
import * as a from './agent.model';
import * as b from '../beliefs';
import * as w from '../model';
import * as AgentHelper from './AgentHelper';
import Vec from '../util/vector';


export class ValueMap {
    private constructor(private values: number[][]) {
    }

    public static generate(beliefs: b.Beliefs) {
        const valueMap = collections.init2D(
            beliefs.width,
            beliefs.height,
            (x, y) => beliefs.cells[y][x].expectedValue());
        return new ValueMap(valueMap);
    }

    clone() {
        return new ValueMap(collections.clone2D(this.values));
    }

    clear(path: Vec[]) {
        for (let i = 0; i < path.length; ++i) {
            const pos = path[i];
            this.values[pos.y][pos.x] = 0;
        }
    }

    value(pos: Vec) {
        return this.values[pos.y][pos.x];
    }
}

export default ValueMap;