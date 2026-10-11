function createPosition(start, end, line, column) {
  return { start, end, line, column };
}
function mergePositions(positions) {
  if (positions.length === 0)
    return;
  const start = Math.min(...positions.map((p) => p.start));
  const end = Math.max(...positions.map((p) => p.end));
  const first = positions[0];
  return {
    start,
    end,
    line: first.line,
    column: first.column
  };
}

export { createPosition, mergePositions };
