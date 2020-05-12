import Vec from '../util/vector';

export namespace Teams {
    export const Self = 0;
    export const Enemy = 1;
}

export namespace Tiles {
    export const Blank = ' ';
    export const Wall = '#';
}

export namespace Forms {
    export const Scissors = "SCISSORS";
    export const Paper = "PAPER";
    export const Rock = "ROCK";
    export const Dead = "DEAD";
}

export interface View {
    tick: number;

    width: number;
    height: number;
    map: string[];

    pacs: Pac[];
    pellets: Pellet[];

    scores: number[];
}

export interface Pac {
    id: number;
    team: number;
    pos: Vec;
    type: string;
    speedTurnsLeft: number;
    abilityCooldown: number;
}

export interface Pellet {
    pos: Vec;
    value: number;
}

export type Action =
    WaitAction
    | MoveAction
    | SwitchAction
    | SpeedAction

export interface ActionBase {
    pac: number;
    type: string;
    tag?: string;
}

export interface WaitAction extends ActionBase {
    type: "wait";
}

export interface MoveAction extends ActionBase {
    type: "move";
    target: Vec;
}

export interface SwitchAction extends ActionBase {
    type: "switch";
    form: string;
}

export interface SpeedAction extends ActionBase {
    type: "speed";
}

export interface CellBelief {
    seenTick: number;
    seenValue: number;
}