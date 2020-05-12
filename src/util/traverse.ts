import Vec from './vector';

const Wrap = true;

export interface Dimensions {
    width: number;
    height: number;
}

export function* all(dimensions: Dimensions): Iterable<Vec> {
    for (let y = 0; y < dimensions.height; ++y) {
        for (let x = 0; x < dimensions.width; ++x) {
            yield new Vec(x, y);
        }
    }
}

export function* ray(dimensions: Dimensions, from: Vec, step: Vec, wrapping: boolean = Wrap): Iterable<Vec> {
    const current = from.clone();

    let limit = 0;
    if (step.x !== 0) {
        limit = Math.max(limit, dimensions.width);
    }
    if (step.y !== 0) {
        limit = Math.max(limit, dimensions.height);
    }

    for (let i = 0; i < limit; ++i) {
        yield current.clone();
        current.add(step);

        if (wrapping) {
            wrap(current, dimensions);
        }
    }
}

export function wrap(pos: Vec, dims: Dimensions) {
    if (pos.x < 0) {
        pos.x += dims.width;
    } else if (pos.x >= dims.width) {
        pos.x -= dims.width;
    }

    if (pos.y < 0) {
        pos.y += dims.height;
    } else if (pos.y >= dims.height) {
        pos.y -= dims.height;
    }
}

export function withinBounds(p: Vec, dimensions: Dimensions) {
    return distanceToEdge(p, dimensions) >= 0;
}

export function* neighbours(pos: Vec, dimensions: Dimensions, wrapping = Wrap): Iterable<Vec> {
    for (const heading of headings()) {
        const next = pos.clone().add(heading);
        if (wrapOrFilter(next, dimensions, wrapping)) {
            yield next;
        }
    }
}

export function* untilRange(from: Vec, maxDistance: number, dimensions: Dimensions, wrapping = Wrap): Iterable<Vec> {
    for (let y = -maxDistance; y <= maxDistance; ++y) {
        for (let x = -maxDistance; x <= maxDistance; ++x) {
            const offset = new Vec(x, y);
            if (offset.l1() <= maxDistance) {
                const pos = from.clone().add(offset);
                if (wrapOrFilter(pos, dimensions, wrapping)) {
                    yield pos;
                }
            }
        }
    }
}

function wrapOrFilter(pos: Vec, dimensions: Dimensions, wrapping = Wrap) {
    if (wrapping) {
        wrap(pos, dimensions);
        return true;
    } else {
        return withinBounds(pos, dimensions);
    }
}

export function distanceToEdge(p: Vec, dimensions: Dimensions) {
    return Math.min(
        p.x, dimensions.width - p.x - 1,
        p.y, dimensions.height - p.y - 1,
    );
}

export function* headings(): Iterable<Vec> {
    yield new Vec(0, 1);
    yield new Vec(1, 0);
    yield new Vec(-1, 0);
    yield new Vec(0, -1);
}