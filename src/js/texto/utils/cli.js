function convertValue(value, type) {
  switch (type) {
    case "string":
    case "attached":
      return value;
    case "boolean":
      if (value === "true" || value === "1")
        return true;
      if (value === "false" || value === "0")
        return false;
      return null;
    case "int": {
      const intVal = parseInt(value, 10);
      return Number.isNaN(intVal) ? null : intVal;
    }
    case "float":
    case "number": {
      const numVal = parseFloat(value);
      return Number.isNaN(numVal) ? null : numVal;
    }
    case "time": {
      const parts = value.split(":");
      if (parts.length < 2 || parts.length > 3)
        return null;
      const hours = parseInt(parts[0], 10);
      const mins = parseInt(parts[1], 10);
      const secs = parts[2] ? parseInt(parts[2], 10) : 0;
      if (Number.isNaN(hours) || Number.isNaN(mins) || Number.isNaN(secs))
        return null;
      if (hours < 0 || hours > 23 || mins < 0 || mins > 59 || secs < 0 || secs > 59)
        return null;
      return value;
    }
    case "date": {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value))
        return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : value;
    }
    case "datetime": {
      const dt = new Date(value);
      return Number.isNaN(dt.getTime()) ? null : value;
    }
    default:
      return null;
  }
}
function getFlagName(arg) {
  if (arg.startsWith("--")) {
    const rest = arg.slice(2);
    const eqIdx = rest.indexOf("=");
    if (eqIdx > 0) {
      return {
        name: rest.slice(0, eqIdx),
        isLong: true,
        isNegated: false,
        hasValue: true,
        value: rest.slice(eqIdx + 1)
      };
    }
    if (rest.startsWith("no-")) {
      return {
        name: rest.slice(3),
        isLong: true,
        isNegated: true,
        hasValue: false
      };
    }
    return { name: rest, isLong: true, isNegated: false, hasValue: false };
  }
  if (arg.startsWith("-") && arg.length > 1) {
    const rest = arg.slice(1);
    if (rest.length > 1 && !rest.startsWith("-")) {
      return {
        name: rest[0],
        isLong: false,
        isNegated: false,
        hasValue: true,
        value: rest.slice(1),
        isAttachedValue: true
      };
    }
    return {
      name: rest,
      isLong: false,
      isNegated: false,
      hasValue: false
    };
  }
  return null;
}
function buildLookup(params) {
  const lookup = new Map;
  for (const [name, param] of Object.entries(params)) {
    if (param.short)
      lookup.set(param.short, name);
    if (param.long)
      lookup.set(param.long, name);
    lookup.set(name, name);
  }
  return lookup;
}
function* iargs(params, ...args) {
  const lookup = buildLookup(params);
  const result = { _positional: [] };
  const provided = new Set;
  for (const [name, param] of Object.entries(params)) {
    if (param.default !== undefined) {
      result[name] = param.many ? [param.default] : param.default;
    }
  }
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    const flag = getFlagName(arg);
    if (!flag) {
      result._positional.push(arg);
      i++;
      continue;
    }
    if (!flag.isLong && flag.name.length > 1 && !flag.hasValue) {
      for (let j = 0;j < flag.name.length; j++) {
        const char = flag.name[j];
        const paramName = lookup.get(char);
        if (!paramName) {
          yield {
            name: char,
            index: i,
            param: null,
            code: "unknown",
            message: `Unknown flag: "-${char}"`,
            value: `-${char}`
          };
          continue;
        }
        const param = params[paramName];
        if (!param) {
          yield {
            name: char,
            index: i,
            param: null,
            code: "unknown",
            message: `Unknown flag: "-${char}"`,
            value: `-${char}`
          };
          continue;
        }
        if (param.type === "boolean") {
          result[paramName] = true;
          provided.add(paramName);
        } else if (param.type === "attached" && j < flag.name.length - 1) {
          const attachedValue = flag.name.slice(j + 1);
          result[paramName] = attachedValue;
          provided.add(paramName);
          break;
        } else {
          yield {
            name: paramName,
            index: i,
            param,
            code: "invalid",
            message: `Combined short flags can only be used with boolean parameters, "${char}" requires a value`,
            value: `-${char}`
          };
        }
      }
      i++;
      continue;
    }
    const paramName = lookup.get(flag.name);
    if (!paramName) {
      yield {
        name: flag.name,
        index: i,
        param: null,
        code: "unknown",
        message: `Unknown flag: "${flag.isLong ? "--" : "-"}${flag.name}"`,
        value: arg
      };
      i++;
      continue;
    }
    const param = params[paramName];
    if (!param) {
      yield {
        name: flag.name,
        index: i,
        param: null,
        code: "unknown",
        message: `Unknown flag: "${flag.isLong ? "--" : "-"}${flag.name}"`,
        value: arg
      };
      i++;
      continue;
    }
    if (flag.isNegated) {
      if (param.type !== "boolean") {
        yield {
          name: paramName,
          index: i,
          param,
          code: "invalid",
          message: `Negated flags (--no-${flag.name}) can only be used with boolean parameters`,
          value: arg
        };
      } else {
        result[paramName] = false;
        provided.add(paramName);
      }
      i++;
      continue;
    }
    let value;
    if (flag.hasValue) {
      const inlineValue = flag.value;
      if (inlineValue === undefined) {
        yield {
          name: paramName,
          index: i,
          param,
          code: "required",
          message: `Flag "${flag.isLong ? "--" : "-"}${flag.name}" requires a value`,
          value: arg
        };
        i++;
        continue;
      }
      value = inlineValue;
    } else if (param.type === "attached" && !flag.isLong) {
      yield {
        name: paramName,
        index: i,
        param,
        code: "required",
        message: `Flag "-${flag.name}" requires an attached value (e.g., -${flag.name}value)`,
        value: arg
      };
      i++;
      continue;
    } else if (flag.isLong && param.type !== "boolean") {
      if (i + 1 >= args.length || args[i + 1].startsWith("-")) {
        yield {
          name: paramName,
          index: i,
          param,
          code: "required",
          message: `Flag "--${flag.name}" requires a value`,
          value: arg
        };
        i++;
        continue;
      }
      value = args[i + 1];
      i++;
    } else if (param.type === "boolean") {
      result[paramName] = true;
      provided.add(paramName);
      i++;
      continue;
    } else {
      if (i + 1 >= args.length) {
        yield {
          name: paramName,
          index: i,
          param,
          code: "required",
          message: `Flag "${flag.isLong ? "--" : "-"}${flag.name}" requires a value`,
          value: arg
        };
        i++;
        continue;
      }
      value = args[i + 1];
      i++;
    }
    const converted = convertValue(value, param.type);
    if (converted === null) {
      yield {
        name: paramName,
        index: i,
        param,
        code: "conversion",
        message: `Cannot convert "${value}" to ${param.type}`,
        value
      };
    } else if (param.choices && typeof converted === "string" && !param.choices.includes(converted)) {
      yield {
        name: paramName,
        index: i,
        param,
        code: "choice",
        message: `Invalid choice "${value}" for ${paramName}, expected one of: ${param.choices.join(", ")}`,
        value
      };
    } else {
      if (param.many) {
        if (!Array.isArray(result[paramName])) {
          result[paramName] = [];
        }
        result[paramName].push(converted);
      } else {
        result[paramName] = converted;
      }
      provided.add(paramName);
    }
    i++;
  }
  for (const [name, param] of Object.entries(params)) {
    if (param.required && !provided.has(name)) {
      yield {
        name,
        index: args.length,
        param,
        code: "required",
        message: `Required parameter "${name}" is missing`,
        value: ""
      };
    }
  }
  return result;
}
function help(params, meta) {
  const width = meta.width ?? 80;
  const lines = [];
  if (meta.command) {
    if (meta.version) {
      lines.push(`${meta.command} ${meta.version}`);
    } else {
      lines.push(meta.command);
    }
    lines.push("");
  }
  if (meta.description) {
    lines.push(meta.description);
    lines.push("");
  }
  if (meta.command) {
    lines.push(`Usage: ${meta.command} [OPTIONS]`);
    lines.push("");
  }
  const paramList = Object.values(params);
  if (paramList.length > 0) {
    lines.push("Options:");
    let maxFlagWidth = 0;
    const flagDescriptions = [];
    for (const param of paramList) {
      let flags = "";
      if (param.short) {
        if (param.type === "boolean") {
          flags += `-${param.short}`;
        } else if (param.type === "attached") {
          flags += `-${param.short}<value>`;
        } else {
          flags += `-${param.short} <value>`;
        }
      }
      if (param.long) {
        if (flags)
          flags += ", ";
        if (param.type === "boolean") {
          flags += `--${param.long}`;
        } else {
          flags += `--${param.long} <value>`;
        }
      }
      maxFlagWidth = Math.max(maxFlagWidth, flags.length);
      let info = param.description ?? "";
      if (param.required) {
        info += info ? " (required)" : "(required)";
      }
      if (param.default !== undefined) {
        info += info ? ` (default: ${JSON.stringify(param.default)})` : `(default: ${JSON.stringify(param.default)})`;
      }
      if (param.choices) {
        info += info ? `
${" ".repeat(24)}Choices: ${param.choices.join(", ")}` : `Choices: ${param.choices.join(", ")}`;
      }
      flagDescriptions.push({ flags, info });
    }
    for (const { flags, info } of flagDescriptions) {
      const padding = " ".repeat(2);
      const flagPadding = " ".repeat(Math.max(0, 24 - flags.length - 2));
      if (flags.length + 2 >= 24) {
        lines.push(`${padding}${flags}`);
        const infoLines = wrapText(info, width - 24);
        for (const line of infoLines) {
          lines.push(`${" ".repeat(24)}${line}`);
        }
      } else {
        const infoLines = wrapText(info, width - 24);
        lines.push(`${padding}${flags}${flagPadding}${infoLines[0]}`);
        for (let i = 1;i < infoLines.length; i++) {
          lines.push(`${" ".repeat(24)}${infoLines[i]}`);
        }
      }
    }
  }
  return lines.join(`
`);
}
function wrapText(text, maxWidth) {
  if (text.length <= maxWidth)
    return [text];
  const lines = [];
  const words = text.split(/\s+/);
  let currentLine = "";
  for (const word of words) {
    if (word.includes(`
`)) {
      const parts = word.split(`
`);
      for (let i = 0;i < parts.length; i++) {
        if (i > 0) {
          lines.push(currentLine.trim());
          currentLine = "";
        }
        if (currentLine.length + parts[i].length + 1 <= maxWidth) {
          currentLine += (currentLine ? " " : "") + parts[i];
        } else {
          if (currentLine)
            lines.push(currentLine.trim());
          currentLine = parts[i];
        }
      }
    } else if (currentLine.length + word.length + 1 <= maxWidth) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine)
        lines.push(currentLine.trim());
      currentLine = word;
    }
  }
  if (currentLine)
    lines.push(currentLine.trim());
  return lines;
}
function args(params, ...args) {
  const gen = iargs(params, ...args);
  const next = gen.next();
  while (!next.done) {
    const error = next.value;
    throw new Error(`CLI Error (${error.code}) at index ${error.index}: ${error.message}`);
  }
  return next.value;
}

export { args, help, iargs };
