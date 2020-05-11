import * as collections from '../util/collections';
import * as traverse from '../util/traverse'
import * as w from '../model';
import Vec from '../util/vector';

export class Pac {
    public seenTick = 0;
    public abilityTick = 0;
    public alive = true;

    constructor(
        public id: number,
        public team: number,
        public pos: Vec,
        public form: string) {
    }

    public static key(team: number, id: number) {
        return `${team === w.Teams.Self ? "S" : "E"}${id}`;
    }

    public get key() {
        return Pac.key(this.team, this.id);
    }

    static initializePacs(view: w.View): Map<string, Pac> {
        return new Map<string, Pac>();
    }

    private static initSelf(view: w.View, sensor: w.Pac): Pac {
        const pac = new Pac(sensor.id, w.Teams.Self, sensor.pos, sensor.type);
        pac.seenTick = view.tick;
        return pac;
    }

    private static initEnemy(view: w.View, sensor: w.Pac): Pac {
        const pos = new Vec(view.width - sensor.pos.x, sensor.pos.y);
        const pac = new Pac(sensor.id, w.Teams.Enemy, pos, sensor.type);
        pac.seenTick = view.tick;
        return pac;
    }

    static update(view: w.View, pacs: Map<string, Pac>) {
        // Initial update
        if (view.tick === 0) {
            for (const sensor of view.pacs) {
                if (sensor.team === w.Teams.Self) {
                    const self = Pac.initSelf(view, sensor);
                    pacs.set(self.key, self);

                    const enemy = Pac.initEnemy(view, sensor);
                    pacs.set(enemy.key, enemy);
                }
            }
        }

        // Incremental update
        const dead = new Set<Pac>(collections.filter(pacs.values(), p => p.team === w.Teams.Self && p.alive));
        for (const sensor of view.pacs) {
            const pac = pacs.get(Pac.key(sensor.team, sensor.id));
            pac.seen(view, sensor);
            dead.delete(pac);
        }

        // Detect dead self pacs
        for (const pac of dead) {
            console.error(`Pac ${pac.key} dead`);
            pac.alive = false;
        }
    }

    private seen(view: w.View, sensor: w.Pac) {
        if (this.form !== sensor.type) {
            this.abilityTick = view.tick;
            console.error(`Detected ${this.key} changed form`);
        }
        if (Vec.l1(sensor.pos, this.pos) > (view.tick - this.seenTick)) {
            this.abilityTick = view.tick;
            console.error(`Detected ${this.key} speeding`);
        }
        this.pos = sensor.pos.clone();
        this.form = sensor.type;
        this.seenTick = view.tick;
        this.abilityTick = sensor.abilityCooldown;
    }
}

export default Pac;