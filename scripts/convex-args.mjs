/**
 * Check `convex run` arguments against a deployment's function spec, before
 * the call leaves the machine.
 *
 * Convex reports every prod ArgumentValidationError to Sentry, including the
 * ones from a hand-run `convex run --prod` with guessed arguments. Most of the
 * argument-validation issues in Sentry have been exactly that: an extra
 * `limit`, a missing `now`, an ISO string where a number goes. `gpp run`
 * checks here first, so a bad call fails locally and never reaches prod.
 *
 * The spec is the JSON `convex function-spec` prints: `{ functions: [{
 * identifier: 'raceNews.js:listForOperators', functionType, visibility,
 * args }] }`, where `args` is a JSON validator (`{ type, value, ... }`).
 */

/** `raceNews.js:listForOperators` -> `raceNews:listForOperators`. */
export function functionName(identifier) {
  const name = identifier.replace(/\.[cm]?js:/, ':');
  return name.endsWith(':default') ? name.slice(0, -':default'.length) : name;
}

/** The spec entry for a `module:function` name, or undefined. */
function findFunction(spec, name) {
  const wanted = name.endsWith(':default')
    ? name.slice(0, -':default'.length)
    : name;
  return spec.functions.find(
    (fn) =>
      fn.functionType !== 'HttpAction' &&
      functionName(fn.identifier) === wanted,
  );
}

function lower(value) {
  return (value ?? '').toLowerCase();
}

/** Length of the prefix two strings share. */
function sharedPrefix(a, b) {
  let i = 0;
  while (i < a.length && a[i] === b[i]) {
    i++;
  }
  return i;
}

/** Up to five names that share the module or the function part of `name`. */
function similarFunctions(spec, name) {
  const [module, fn] = name.split(':');
  const names = spec.functions
    .filter((entry) => entry.functionType !== 'HttpAction')
    .map((entry) => functionName(entry.identifier));
  const sameFunction = names.filter(
    (candidate) => fn && lower(candidate.split(':')[1]) === lower(fn),
  );
  // Same module, closest function name first.
  const sameModule = names
    .filter(
      (candidate) =>
        module &&
        lower(candidate.split(':')[0]) === lower(module) &&
        !sameFunction.includes(candidate),
    )
    .map((candidate) => ({
      candidate,
      score: sharedPrefix(lower(candidate.split(':')[1]), lower(fn)),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ candidate }) => candidate);
  return [...sameFunction, ...sameModule].slice(0, 5);
}

function describe(validator) {
  switch (validator.type) {
    case 'literal':
      return JSON.stringify(validator.value);
    case 'id':
      return `id<${validator.tableName}>`;
    case 'array':
      return `${describe(validator.value)}[]`;
    case 'union':
      return validator.value.map(describe).join(' | ');
    case 'object':
      return 'object';
    case 'record':
      return 'record';
    default:
      return validator.type;
  }
}

function typeOf(value) {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  return typeof value;
}

function at(path) {
  return path || 'args';
}

function child(path, key) {
  return path ? `${path}.${key}` : key;
}

/**
 * Problems with `value` against a JSON validator, as one line each, in the
 * terms Convex itself would use. Empty when the value would pass.
 */
function validate(validator, value, path = '') {
  switch (validator.type) {
    case 'any':
      return [];
    case 'null':
      return value === null
        ? []
        : [`${at(path)}: expected null, got ${typeOf(value)}`];
    case 'string':
    case 'id':
      return typeof value === 'string'
        ? []
        : [
            `${at(path)}: expected ${describe(validator)}, got ${typeOf(value)} ${JSON.stringify(value)}`,
          ];
    case 'number':
      return typeof value === 'number'
        ? []
        : [
            `${at(path)}: expected number, got ${typeOf(value)} ${JSON.stringify(value)}`,
          ];
    case 'bigint':
    case 'int64':
      return typeof value === 'object' && value !== null && '$integer' in value
        ? []
        : [
            `${at(path)}: expected int64 ({"$integer": ...}), got ${typeOf(value)}`,
          ];
    case 'boolean':
      return typeof value === 'boolean'
        ? []
        : [
            `${at(path)}: expected boolean, got ${typeOf(value)} ${JSON.stringify(value)}`,
          ];
    case 'bytes':
      return typeof value === 'object' && value !== null && '$bytes' in value
        ? []
        : [
            `${at(path)}: expected bytes ({"$bytes": ...}), got ${typeOf(value)}`,
          ];
    case 'literal':
      return value === validator.value
        ? []
        : [
            `${at(path)}: expected ${JSON.stringify(validator.value)}, got ${JSON.stringify(value)}`,
          ];
    case 'array':
      if (!Array.isArray(value)) {
        return [
          `${at(path)}: expected ${describe(validator)}, got ${typeOf(value)}`,
        ];
      }
      return value.flatMap((item, index) =>
        validate(validator.value, item, `${path}[${index}]`),
      );
    case 'union': {
      const options = validator.value;
      if (
        options.some((option) => validate(option, value, path).length === 0)
      ) {
        return [];
      }
      // One object member: its own field-level problems say more than
      // "matched none of".
      const objects = options.filter((option) => option.type === 'object');
      if (objects.length === 1 && typeOf(value) === 'object') {
        return validate(objects[0], value, path);
      }
      return [
        `${at(path)}: expected ${describe(validator)}, got ${JSON.stringify(value)}`,
      ];
    }
    case 'record':
      if (typeOf(value) !== 'object') {
        return [`${at(path)}: expected record, got ${typeOf(value)}`];
      }
      return Object.entries(value).flatMap(([key, item]) =>
        validate(
          validator.values?.fieldType ?? { type: 'any' },
          item,
          child(path, key),
        ),
      );
    case 'object': {
      if (typeOf(value) !== 'object') {
        return [`${at(path)}: expected object, got ${typeOf(value)}`];
      }
      const fields = validator.value;
      const problems = [];
      for (const key of Object.keys(value)) {
        if (!(key in fields)) {
          problems.push(
            `${at(path)}: extra field \`${key}\` is not in the validator`,
          );
        }
      }
      for (const [key, field] of Object.entries(fields)) {
        if (value[key] === undefined) {
          if (!field.optional) {
            problems.push(
              `${at(path)}: missing required field \`${key}\` (${describe(field.fieldType)})`,
            );
          }
          continue;
        }
        problems.push(
          ...validate(field.fieldType, value[key], child(path, key)),
        );
      }
      return problems;
    }
    default:
      // A validator type this file does not know yet: let Convex judge it.
      return [];
  }
}

/** `{ a: string, b?: number }`, for showing what a function takes. */
function signature(validator) {
  if (!validator || validator.type !== 'object') {
    return validator ? describe(validator) : '{}';
  }
  const fields = Object.entries(validator.value).map(
    ([key, field]) =>
      `${key}${field.optional ? '?' : ''}: ${describe(field.fieldType)}`,
  );
  return fields.length ? `{ ${fields.join(', ')} }` : '{}';
}

/**
 * Check a call. Returns `{ fn }` when it would pass, or `{ error }` with the
 * lines to print when it would not.
 */
export function checkCall(spec, name, args) {
  const fn = findFunction(spec, name);
  if (!fn) {
    const similar = similarFunctions(spec, name);
    return {
      error: [
        `${name} is not a function on this deployment.`,
        ...(similar.length ? [`Did you mean: ${similar.join(', ')}`] : []),
      ],
    };
  }
  const problems = fn.args ? validate(fn.args, args) : [];
  if (problems.length) {
    return {
      error: [
        `${name} would reject these args:`,
        ...problems.map((problem) => `  ${problem}`),
        `${name} takes ${signature(fn.args)}`,
      ],
    };
  }
  return { fn };
}
