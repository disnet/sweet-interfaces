'lang sweet.js';
import { unwrap, isIdentifier, isKeyword, isParens, isBraces, isPunctuator } from '@sweet-js/helpers';

export const $ = {};

export function matchPunctuator(ctx, value) {
  let t = ctx.next();
  if (t.done) throw new Error(`No syntax to match, expecting ${value == null ? 'punctuator' : value}`);
  if (isPunctuator(t.value) && unwrap(t.value).value === value) {
    return t.value;
  }
  throw new Error(`Could not match punctuator ${value}: ${t.value}`);
}

export function matchIdentifierOrKeyword(ctx) {
  let t = ctx.next();
  if (t.done) throw new Error(`No syntax to match`);
  if (!(isIdentifier(t.value) || isKeyword(t.value))) throw new Error(`Not an identifier or a keyword: ${t.value}`);
  return t.value;
}

export function matchIdentifier(ctx) {
  let t = ctx.next();
  if (t.done) throw new Error(`No syntax to match`);
  if (!isIdentifier(t.value)) {
    throw new Error(`Expecting an identifier: ${t.value}`);
  }
  return t.value;
}

export function matchParens(ctx) {
  let t = ctx.next();
  if (t.done) throw new Error(`No syntax to match`);
  if (!isParens(t.value)) throw new Error(`Not a paren delimiter: ${t.value}`);
  return t.value;
}

export function matchBraces(ctx) {
  let t = ctx.next();
  if (t.done) throw new Error(`No syntax to match`);
  if (!isBraces(t.value)) throw new Error(`Not a braces delimiter: ${t.value}`);
  return t.value;
}

export function matchAny(value, ctx) {
  let t = ctx.next();
  if (t.done) throw new Error(`could not match ${value}`);
  let v = unwrap(t.value);
  if (v.value != null) {
    return value === v.value;
  }
  return false;
}

export function eatUntil(value, ctx) {
  for (let stx of ctx) {
    if (unwrap(stx).value === value) break;
  }
}

export function matchPattern(patterns, ctx) {
  let results = [];
  for (let pattern of patterns) {
    let t = ctx.next();
    if (t.done) throw new Error(`could not match ${pattern}, no more syntax to consume`);
    if (pattern === $) {
      results.push(t.value);
    } else {
      let v = unwrap(t.value);
      if (v.value == null || v.value !== pattern) throw new Error(`could not match ${pattern}, got ${v.value}`);
    }
  }
  return results;
}

function matchInterfaceField(ctx) {
  let name = matchIdentifierOrKeyword(ctx);
  matchPunctuator(ctx, ';');
  return {
    type: 'field',
    name
  };
}

function matchInterfaceMethod(ctx) {
  let name = matchIdentifierOrKeyword(ctx);
  let parens = matchParens(ctx);
  let body = matchBraces(ctx);
  return {
    type: 'method',
    name, parens, body
  };
}

function isDone(ctx) {
  let mark = ctx.mark();
  let result = ctx.next().done;
  ctx.reset(mark);
  return result;
}

export function matchImplements(ctx) {
  let mark = ctx.mark();
  let implKw = ctx.next().value;
  if (isIdentifier(implKw) && unwrap(implKw).value === 'implements') {
    return { value: matchIdentifier(ctx) };
  }
  ctx.reset(mark);
  return {};
}

// extends a extends b
export function matchExtendsClause(ctx) {
  let result = [];
  while (!isDone(ctx)) {
    let mark = ctx.mark();
    let ext = ctx.next().value;
    if (isKeyword(ext) && unwrap(ext).value === 'extends') {
      let name = matchIdentifier(ctx);
      result.push({ name });
    } else {
      ctx.reset(mark);
      break;
    }
  }
  return result;
}

export function matchInterfaceItems(ctx) {
  let result = [];
  while (!isDone(ctx)) {
    let mark = ctx.mark();
    try {
      result.push(matchInterfaceField(ctx));
    } catch (e) {
      ctx.reset(mark);
      result.push(matchInterfaceMethod(ctx));
    }
  }
  return result;
}
