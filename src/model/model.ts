import Vec from '../util/vector';

export namespace Teams {
    export const Self = 0;
    export const Enemy = 1;
}

export namespace Tiles {
    export const Blank = ' ';
    export const Wall = '#';
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

export interface CellBelief {
    seenTick: number;
    seenValue: number;
}