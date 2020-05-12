import * as collections from '../util/collections';
import * as traverse from '../util/traverse'
import * as w from '../model';
import Vec from '../util/vector';

export class Pac {
    public seenTick = 0;
    public abilityCooldownUntilTick = 0;
    public alive = true;
    public speedUntilTick = 0;

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
        for (const sensor of view.pacs) {
            const pac = pacs.get(Pac.key(sensor.team, sensor.id));
            pac.seen(view, sensor);
        }
    }

    private seen(view: w.View, sensor: w.Pac) {
        if (this.form !== sensor.type) {
            console.error(`Detected ${this.key} changed form`);
        }
        if (sensor.speedTurnsLeft > 0) {
            console.error(`Detected ${this.key} speeding`);
        }
        if (sensor.abilityCooldown > 0) {
            console.error(`Detected ${this.key} abilityCooldown=${sensor.abilityCooldown}`);
        }

        if (sensor.type === w.Forms.Dead) {
            this.alive = false;
        } else {
            this.pos = sensor.pos.clone();
            this.form = sensor.type;
            this.seenTick = view.tick;
            this.abilityCooldownUntilTick = sensor.abilityCooldown ? view.tick + sensor.abilityCooldown : 0;
            this.speedUntilTick = sensor.speedTurnsLeft ? view.tick + sensor.speedTurnsLeft : 0;
        }
    }
}

export default Pac;