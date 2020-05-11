import * as w from './model';

export function clone(world: w.View): w.View {
    return {
        ...world,
        map: [...world.map],
        scores: [...world.scores],
        pacs: [...world.pacs],
        pellets: [...world.pellets],
    };
}