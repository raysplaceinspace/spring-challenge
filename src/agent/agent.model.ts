import Vec from "../util/vector";

export interface AgentParams {
    DiscountRate: number;
    NearbyEnemiesTicks: number;
    MoveTimeoutMilliseconds: number;
    SearchRange: number;
}

export function defaultParams(): AgentParams {
    return {
        DiscountRate: 1.2,
        NearbyEnemiesTicks: 10,
        MoveTimeoutMilliseconds: 40,
        SearchRange: 46,
    };
}