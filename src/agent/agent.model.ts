import Vec from "../util/vector";

export interface AgentParams {
    DiscountRate: number;
    NearbyEnemiesTicks: number;
    MoveTimeoutMilliseconds: number;
    Penalty: number;
    SearchRange: number;
    SpeedRange: number;
    SafeTicks: number;
}

export interface TargetCandidate {
    target: Vec;
    payoff: number;
}

export function defaultParams(): AgentParams {
    return {
        DiscountRate: 1.2,
        NearbyEnemiesTicks: 10,
        MoveTimeoutMilliseconds: 40,
        Penalty: 1000,
        SearchRange: 46,
        SafeTicks: 10,
        SpeedRange: 5,
    };
}