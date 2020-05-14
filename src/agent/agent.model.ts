import Vec from "../util/vector";

export interface AgentParams {
    DiscountRate: number;
    NearbyEnemiesTicks: number;
    MoveTimeoutMilliseconds: number;
    ImprovementRange: number;
    SearchRange: number;
}

export function defaultParams(): AgentParams {
    return {
        DiscountRate: 1.2,
        NearbyEnemiesTicks: 11,
        MoveTimeoutMilliseconds: 40,
        ImprovementRange: 5,
        SearchRange: 100,
    };
}