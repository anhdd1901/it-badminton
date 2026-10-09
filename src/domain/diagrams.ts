export type Slot = number;
export type DiagramMatch = readonly [readonly [Slot, Slot], readonly [Slot, Slot]];
export type Diagram = {
  id: string;
  seed1: number | null;
  seed2: number | null;
  matches: readonly DiagramMatch[];
};

// Source: spec "Phụ lục A. Sơ đồ trận đấu". Match order and slot order within pairs are significant.
export const DIAGRAMS: readonly Diagram[] = [
  {
    id: "5",
    seed1: null,
    seed2: null,
    matches: [
      [[2, 3], [4, 5]],
      [[1, 4], [3, 5]],
      [[1, 5], [2, 4]],
      [[1, 3], [2, 5]],
      [[1, 2], [3, 4]],
    ],
  },
  {
    id: "6-0-6",
    seed1: 0,
    seed2: 6,
    matches: [
      [[5, 6], [7, 8]],
      [[5, 7], [9, 10]],
      [[6, 9], [8, 10]],
      [[5, 10], [6, 7]],
      [[5, 9], [6, 8]],
      [[7, 10], [8, 9]],
    ],
  },
  {
    id: "6-1-5",
    seed1: 1,
    seed2: 5,
    matches: [
      [[1, 5], [6, 7]],
      [[1, 6], [8, 9]],
      [[5, 8], [7, 9]],
      [[1, 7], [6, 9]],
      [[1, 8], [5, 7]],
      [[5, 9], [6, 8]],
    ],
  },
  {
    id: "6-2-4",
    seed1: 2,
    seed2: 4,
    matches: [
      [[1, 5], [2, 6]],
      [[1, 7], [2, 8]],
      [[5, 6], [7, 8]],
      [[1, 6], [2, 5]],
      [[1, 8], [2, 7]],
      [[5, 7], [6, 8]],
    ],
  },
  {
    id: "6-3-3",
    seed1: 3,
    seed2: 3,
    matches: [
      [[1, 6], [3, 7]],
      [[2, 7], [3, 5]],
      [[1, 2], [5, 6]],
      [[1, 3], [5, 7]],
      [[1, 7], [2, 6]],
      [[2, 5], [3, 6]],
    ],
  },
  {
    id: "6-4-2",
    seed1: 4,
    seed2: 2,
    matches: [
      [[1, 2], [3, 4]],
      [[1, 5], [2, 6]],
      [[3, 5], [4, 6]],
      [[1, 3], [2, 4]],
      [[1, 6], [2, 5]],
      [[3, 6], [4, 5]],
    ],
  },
  {
    id: "7-1-6",
    seed1: 1,
    seed2: 6,
    matches: [
      [[1, 8], [5, 10]],
      [[1, 6], [8, 9]],
      [[5, 7], [9, 10]],
      [[1, 5], [6, 7]],
      [[6, 9], [8, 10]],
      [[5, 9], [7, 10]],
      [[1, 7], [6, 8]],
    ],
  },
  {
    id: "7-2-5",
    seed1: 2,
    seed2: 5,
    matches: [
      [[1, 6], [2, 7]],
      [[5, 7], [8, 9]],
      [[1, 5], [2, 6]],
      [[6, 8], [7, 9]],
      [[1, 9], [2, 5]],
      [[5, 6], [7, 8]],
      [[1, 8], [2, 9]],
    ],
  },
  {
    id: "7-3-4",
    seed1: 3,
    seed2: 4,
    matches: [
      [[1, 5], [2, 6]],
      [[1, 7], [3, 8]],
      [[2, 5], [3, 6]],
      [[1, 8], [2, 7]],
      [[1, 6], [3, 7]],
      [[2, 8], [3, 5]],
      [[5, 6], [7, 8]],
    ],
  },
  {
    id: "7-4-3",
    seed1: 4,
    seed2: 3,
    matches: [
      [[1, 2], [3, 4]],
      [[1, 6], [2, 7]],
      [[3, 5], [4, 7]],
      [[1, 5], [2, 6]],
      [[3, 7], [4, 6]],
      [[1, 7], [4, 5]],
      [[2, 5], [3, 6]],
    ],
  },
  {
    id: "8-2-6",
    seed1: 2,
    seed2: 6,
    matches: [
      [[5, 6], [7, 10]],
      [[1, 8], [2, 9]],
      [[5, 7], [6, 10]],
      [[1, 9], [2, 8]],
      [[1, 7], [2, 10]],
      [[5, 10], [8, 9]],
      [[1, 5], [2, 6]],
      [[6, 8], [7, 9]],
    ],
  },
  {
    id: "8-3-5",
    seed1: 3,
    seed2: 5,
    matches: [
      [[1, 7], [3, 8]],
      [[1, 6], [2, 9]],
      [[5, 6], [7, 8]],
      [[2, 8], [3, 9]],
      [[5, 7], [6, 9]],
      [[1, 8], [2, 5]],
      [[1, 9], [3, 6]],
      [[2, 7], [3, 5]],
    ],
  },
  {
    id: "8-4-4",
    seed1: 4,
    seed2: 4,
    matches: [
      [[1, 2], [3, 4]],
      [[5, 6], [7, 8]],
      [[1, 3], [2, 4]],
      [[5, 7], [6, 8]],
      [[2, 5], [4, 7]],
      [[1, 6], [3, 8]],
      [[3, 7], [4, 8]],
      [[1, 5], [2, 6]],
    ],
  },
  {
    id: "9-3-6",
    seed1: 3,
    seed2: 6,
    matches: [
      [[1, 6], [2, 10]],
      [[1, 7], [3, 8]],
      [[5, 7], [9, 10]],
      [[2, 8], [3, 10]],
      [[5, 6], [7, 8]],
      [[1, 10], [3, 9]],
      [[1, 5], [2, 6]],
      [[2, 9], [3, 7]],
      [[5, 9], [6, 8]],
    ],
  },
  {
    id: "9-4-5",
    seed1: 4,
    seed2: 5,
    matches: [
      [[1, 5], [3, 6]],
      [[2, 7], [4, 8]],
      [[1, 6], [2, 9]],
      [[5, 6], [7, 8]],
      [[1, 3], [2, 4]],
      [[5, 8], [7, 9]],
      [[1, 2], [3, 4]],
      [[5, 7], [6, 9]],
      [[3, 8], [4, 9]],
    ],
  },
  {
    id: "10-4-6",
    seed1: 4,
    seed2: 6,
    matches: [
      [[1, 3], [2, 4]],
      [[6, 7], [9, 10]],
      [[1, 5], [3, 8]],
      [[2, 6], [4, 7]],
      [[5, 10], [8, 9]],
      [[1, 4], [2, 3]],
      [[5, 8], [6, 9]],
      [[1, 7], [4, 10]],
      [[2, 8], [3, 9]],
      [[5, 6], [7, 10]],
    ],
  },
];

/** 5 players: slots 1..5; otherwise 1..seed1 and 5..4+seed2. */
export function diagramSlots(d: Diagram): Slot[] {
  if (d.seed1 === null || d.seed2 === null) return [1, 2, 3, 4, 5];
  const slots: Slot[] = [];
  for (let i = 1; i <= d.seed1; i++) slots.push(i);
  for (let i = 5; i <= 4 + d.seed2; i++) slots.push(i);
  return slots;
}

/** Returns a list of problems; empty when the diagram is valid. */
export function validateDiagram(d: Diagram): string[] {
  const errors: string[] = [];
  const slots = diagramSlots(d);
  if (d.matches.length !== slots.length) {
    errors.push(`Số trận (${d.matches.length}) khác số người (${slots.length})`);
  }
  const counts = new Map<Slot, number>();
  d.matches.forEach((m, i) => {
    const four = [...m[0], ...m[1]];
    if (new Set(four).size !== 4) errors.push(`Trận ${i + 1}: 4 vị trí phải khác nhau`);
    for (const s of four) {
      if (!slots.includes(s)) errors.push(`Trận ${i + 1}: vị trí ${s} ngoài sơ đồ`);
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
  });
  for (const s of slots) {
    const c = counts.get(s) ?? 0;
    if (c !== 4) errors.push(`Vị trí ${s} xuất hiện ${c} lần, cần 4`);
  }
  return errors;
}

export function findDiagram(playerCount: number, seed1: number, seed2: number): Diagram | null {
  if (playerCount === 5) return DIAGRAMS.find((d) => d.id === "5") ?? null;
  return (
    DIAGRAMS.find(
      (d) =>
        d.seed1 !== null &&
        d.seed2 !== null &&
        d.seed1 === seed1 &&
        d.seed2 === seed2 &&
        d.seed1 + d.seed2 === playerCount,
    ) ?? null
  );
}
