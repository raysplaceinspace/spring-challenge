import Vec from "../util/vector";

export interface AgentParams {
    DiscountRate: number;
    NearbyEnemiesTicks: number;
    MoveTimeoutMilliseconds: number;
    Penalty: number;
    SpeedRange: number;
    SpeedTicks: number;
}

export interface Candidate {
    pos: Vec;
    value: number;
    requiredForm?: string;
}

export function defaultParams(): AgentParams {
    return {
        DiscountRate: 1.07,
        NearbyEnemiesTicks: 10,
        MoveTimeoutMilliseconds: 40,
        Penalty: 1000,
        SpeedTicks: 10,
        SpeedRange: 5,
    };
}