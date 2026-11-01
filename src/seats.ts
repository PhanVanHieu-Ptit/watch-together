// Numeric seatId 0–99 is the server contract; labels and positions never depend on occupancy.
export const SEATS = Array.from({ length: 100 }, (_, seatId) => {
  const row = Math.floor(seatId / 10), column = seatId % 10;
  // Clusters 1 | 2 | 3 || 2 | 2; a wide aisle follows column 6.
  const cluster = column < 1 ? 0 : column < 3 ? 1 : column < 6 ? 2 : column < 8 ? 3 : 4;
  const gaps = [0, .35, .35, .7, .7, .7, 2, 2, 2.35, 2.35];
  return { seatId, row, column, label: String.fromCharCode(65 + row) + (column + 1),
    cluster: `${row}-${cluster}`, size: [1, 2, 3, 2, 2][cluster],
    x: (column - 4.5) * .9 + gaps[column] - 1.175, y: row * .16, z: -3.5 + row * 1.12 };
});
export const seatLabel = (id: number) => SEATS[id]?.label ?? "—";
