import Vec from "../util/vector";

export interface AgentParams {
    AbilityCooldown: number;
    DiscountRate: number;
    AttackValue: number;
    NearbyEnemiesTicks: number;
    NearbyEnemyRange: number;
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
        AbilityCooldown: 5,
        AttackValue: 0,
        NearbyEnemiesTicks: 3,
        NearbyEnemyRange: 3,
        MoveTimeoutMilliseconds: 40,
        Penalty: 1000,
        SpeedTicks: 10,
        SpeedRange: 10,
    };
}