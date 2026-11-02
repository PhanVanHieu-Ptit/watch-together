// Numeric seatId 0–99 is the server contract; labels and positions never depend on occupancy.
export const SEATS = Array.from({ length: 100 }, (_, seatId) => {
  const row = Math.floor(seatId / 10), column = seatId % 10;
  // Layout matches the reference: single | double | triple || triple | single.
  const cluster = column === 0 ? 0 : column < 3 ? 1 : column < 6 ? 2 : column < 9 ? 3 : 4;
  return { seatId, row, column, label: String.fromCharCode(65 + row) + String(column + 1).padStart(2, '0'),
    cluster: `${row}-${cluster}`, size: [1, 2, 3, 3, 1][cluster],
    x: [-10,-7.5,-6.15,-3.25,-1.9,-.55,2.35,3.7,5.05,8.4][column], y: row * .34, z: -1 + row * 2 };
});
export const seatLabel = (id: number) => SEATS[id]?.label ?? "—";
