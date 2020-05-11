import * as w from './model';
import Vec from '../util/vector';

export function initialView(width: number, height: number, map: string[]): w.View {
    return {
        tick: 0,
        width,
        height,
        map,
        scores: [0, 0],
        pacs: [],
        pellets: [],
    };
}
