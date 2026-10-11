const clamp = (value, min, max) => {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};
const pushRetain = (ops, count) => {
  if (count <= 0) {
    return;
  }
  const last = ops[ops.length - 1];
  if (last && "retain" in last) {
    last.retain += count;
    return;
  }
  ops.push({ retain: count });
};
const pushInsert = (ops, value) => {
  if (!value) {
    return;
  }
  const last = ops[ops.length - 1];
  if (last && "insert" in last) {
    last.insert += value;
    return;
  }
  ops.push({ insert: value });
};
const pushDelete = (ops, count) => {
  if (count <= 0) {
    return;
  }
  const last = ops[ops.length - 1];
  if (last && "delete" in last) {
    last.delete += count;
    return;
  }
  ops.push({ delete: count });
};
const hasRangeHints = (start, end) => {
  return Number.isInteger(start) && Number.isInteger(end);
};
let diffEngine = null;
const setDiffEngine = (engine) => {
  diffEngine = engine;
};
const applyDiffChanges = (ops, changes) => {
  for (const [operation, text] of changes) {
    if (!text) {
      continue;
    }
    if (operation === 0) {
      pushRetain(ops, text.length);
      continue;
    }
    if (operation === 1) {
      pushInsert(ops, text);
      continue;
    }
    if (operation === -1) {
      pushDelete(ops, text.length);
      continue;
    }
    throw new Error("Invalid diff engine operation");
  }
};
const delta = (oldtext, newtext, start, end) => {
  if (oldtext === newtext) {
    return [];
  }
  let prefix = 0;
  let oldEnd = oldtext.length;
  let newEnd = newtext.length;
  if (hasRangeHints(start, end)) {
    const boundedStart = clamp(start, 0, Math.min(oldtext.length, newtext.length));
    const boundedEnd = clamp(end, boundedStart, oldtext.length);
    prefix = boundedStart;
    while (prefix < boundedEnd && prefix < newEnd && oldtext[prefix] === newtext[prefix]) {
      prefix += 1;
    }
    while (oldEnd > boundedEnd && newEnd > prefix && oldtext[oldEnd - 1] === newtext[newEnd - 1]) {
      oldEnd -= 1;
      newEnd -= 1;
    }
  } else {
    const maxPrefix = Math.min(oldtext.length, newtext.length);
    while (prefix < maxPrefix && oldtext[prefix] === newtext[prefix]) {
      prefix += 1;
    }
  }
  while (oldEnd > prefix && newEnd > prefix && oldtext[oldEnd - 1] === newtext[newEnd - 1]) {
    oldEnd -= 1;
    newEnd -= 1;
  }
  const ops = [];
  pushRetain(ops, prefix);
  if (diffEngine) {
    const middleOld = oldtext.slice(prefix, oldEnd);
    const middleNew = newtext.slice(prefix, newEnd);
    applyDiffChanges(ops, diffEngine(middleOld, middleNew));
  } else {
    pushDelete(ops, oldEnd - prefix);
    pushInsert(ops, newtext.slice(prefix, newEnd));
  }
  pushRetain(ops, oldtext.length - oldEnd);
  return ops;
};
const apply = (text, patches) => {
  let sourceCursor = 0;
  let outputCursor = 0;
  let rangeMin = Number.POSITIVE_INFINITY;
  let rangeMax = -1;
  const out = [];
  const markRange = (start, end) => {
    rangeMin = Math.min(rangeMin, start);
    rangeMax = Math.max(rangeMax, end);
  };
  for (const op of patches) {
    if ("retain" in op) {
      if (op.retain < 0) {
        throw new Error("Invalid retain operation");
      }
      out.push(text.slice(sourceCursor, sourceCursor + op.retain));
      sourceCursor += op.retain;
      outputCursor += op.retain;
      continue;
    }
    if ("insert" in op) {
      if (op.insert.length > 0) {
        markRange(outputCursor, outputCursor + op.insert.length);
        out.push(op.insert);
        outputCursor += op.insert.length;
      }
      continue;
    }
    if (op.delete < 0) {
      throw new Error("Invalid delete operation");
    }
    if (op.delete > 0) {
      markRange(outputCursor, outputCursor + op.delete);
      sourceCursor += op.delete;
    }
  }
  if (sourceCursor > text.length) {
    throw new Error("Patch exceeds input text length");
  }
  out.push(text.slice(sourceCursor));
  if (!Number.isFinite(rangeMin)) {
    return { text: out.join(""), range: [0, 0] };
  }
  return { text: out.join(""), range: [rangeMin, rangeMax] };
};
const revert = (oldtext, newtext, patches) => {
  if (!patches) {
    return delta(newtext, oldtext);
  }
  let oldCursor = 0;
  const inverse = [];
  for (const op of patches) {
    if ("retain" in op) {
      pushRetain(inverse, op.retain);
      oldCursor += op.retain;
      continue;
    }
    if ("insert" in op) {
      pushDelete(inverse, op.insert.length);
      continue;
    }
    const deleted = oldtext.slice(oldCursor, oldCursor + op.delete);
    pushInsert(inverse, deleted);
    oldCursor += op.delete;
  }
  return inverse;
};

export { apply, delta, revert, setDiffEngine };
