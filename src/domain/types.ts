export type LocalDate = string; // "YYYY-MM-DD"
export type SeasonId = string; // "YYYY-MM"
export type MemberId = string;
export type Pair = readonly [MemberId, MemberId];
export type Winner = "A" | "B";
export type Rng = () => number; // [0, 1)
export type Role = "admin" | "subadmin" | "member";
