export function* range(count: number): Iterable<number> {
    for (let i = 0; i < count; ++i) {
        yield i;
    }
}

export function create1D<T>(length: number, initial: T): T[] {
    const array = new Array<T>();
    for (let i = 0; i < length; ++i) {
        array[i] = initial;
    }
    return array;
}

export function create2D<T>(width: number, height: number, initial: T): T[][] {
    const array = new Array<T[]>();
    for (let y = 0; y < height; ++y) {
        array[y] = new Array<T>();
        for (let x = 0; x < width; ++x) {
            array[y][x] = initial;
        }
    }
    return array;
}

export function init2D<T>(width: number, height: number, initializer: (x: number, y: number) => T): T[][] {
    const array = new Array<T[]>();
    for (let y = 0; y < height; ++y) {
        array[y] = new Array<T>();
        for (let x = 0; x < width; ++x) {
            array[y][x] = initializer(x, y);
        }
    }
    return array;
}

export function clone2D<T>(source: T[][]): T[][] {
    const array = new Array<T[]>();
    for (let y = 0; y < source.length; ++y) {
        array[y] = [...source[y]];
    }
    return array;
}

export function some<K, V>(collection: Iterable<V>, predicate: (value: V) => boolean): boolean {
    for (const value of collection) {
        if (predicate(value)) {
            return true;
        }
    }
    return false;
}

export function minBy<T>(items: Iterable<T>, selector: (item: T) => number): T {
    let current = null;
    let currentValue = Infinity;

    for (const item of items) {
        const value = selector(item);
        if (value < currentValue) {
            currentValue = value;
            current = item;
        }
    }

    return current;
}

export function maxBy<T>(items: Iterable<T>, selector: (item: T) => number): T {
    let current = null;
    let currentValue = -Infinity;

    for (const item of items) {
        const value = selector(item);
        if (value > currentValue) {
            currentValue = value;
            current = item;
        }
    }

    return current;
}

export function* map<T, V>(items: Iterable<T>, selector: (item: T) => V): Iterable<V> {
    for (const item of items) {
        yield selector(item);
    }
}

export function* filter<T>(items: Iterable<T>, selector: (item: T) => boolean): Iterable<T> {
    for (const item of items) {
        if (selector(item)) {
            yield item;
        }
    }
}

export function groupBy<T, K>(items: Iterable<T>, selector: (item: T) => K): Map<K, T[]> {
    const groups = new Map<K, T[]>();
    for (const item of items) {
        const key = selector(item);
        let group = groups.get(key);
        if (!group) {
            group = [];
            groups.set(key, group);
        }
        group.push(item);
    }
    return groups;
}

export function lookup<T, K>(items: Iterable<T>, selector: (item: T) => K): Map<K, T> {
    const lookup = new Map<K, T>();
    for (const item of items) {
        lookup.set(selector(item), item);
    }
    return lookup;
}

export function toArray<T>(items: Iterable<T>): T[] {
    const result = new Array<T>();
    for (const item of items) {
        result.push(item);
    }
    return result;
}

export function sum<T>(items: Iterable<T>, selector: (item: T) => number): number {
    let total = 0;
    for (const item of items) {
        total += selector(item);
    }
    return total;
}

export function shuffle<T>(items: T[]): T[] {
    const remaining = [...items];
    const result = new Array<T>();
    while (remaining.length > 0) {
        const next = Math.floor(Math.random() * remaining.length);
        result.push(...remaining.splice(next, 1));
    }
    return result;
}