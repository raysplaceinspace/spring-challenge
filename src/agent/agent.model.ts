import Vec from "../util/vector";

export interface AgentParams {
    DiscountRate: number;
    NearbyEnemiesTicks: number;
    MoveTimeoutMilliseconds: number;
    Penalty: number;
    SearchRange: number;
    SpeedRange: number;
    SpeedTicks: number;
}

export function defaultParams(): AgentParams {
    return {
        DiscountRate: 1.07,
        NearbyEnemiesTicks: 10,
        MoveTimeoutMilliseconds: 40,
        Penalty: 1000,
        SearchRange: 30,
        SpeedTicks: 10,
        SpeedRange: 5,
    };
}