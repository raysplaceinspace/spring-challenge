export interface AgentParams {
    DiscountRate: number;
    RecentEnemiesTicks: number;
    NearbyEnemyRange: number;
    MoveTimeoutMilliseconds: number;
    UseSpeed: boolean;
}

export function defaultParams(): AgentParams {
    return {
        DiscountRate: 1.07,
        RecentEnemiesTicks: 3,
        NearbyEnemyRange: 3,
        MoveTimeoutMilliseconds: 40,
        UseSpeed: false,
    };
}