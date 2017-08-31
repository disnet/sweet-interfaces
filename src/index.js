'lang sweet.js';
import { matchImplements, matchClassExtendsClause, matchInterfaceExtendsClause, matchAny, matchInterfaceItems, matchIdentifier, matchBraces } from './match-util' for syntax;
import { isIdentifier, isKeyword, isStringLiteral, isNumericLiteral, isBrackets, isBraces, isParens, unwrap, fromStringLiteral, fromIdentifier } from '@sweet-js/helpers' for syntax;

/*
TODO:
- what do we do about extending interfaces that conflict?
- do we actually need to put the symbols on the prototype?
*/

export syntax protocol = ctx => {
  function join(ts) {
    return ts.reduce((accum, t) => accum.concat(t), #``);
  }

  let here = #`here`.first();
  let interfaceName = matchIdentifier(ctx);
  let extendsClause = matchInterfaceExtendsClause(ctx);
  let body = matchBraces(ctx);
  let inner = ctx.contextify(body);
  let items = matchInterfaceItems(inner);

  let allSymbols = items.filter(i => i.type === 'symbol');
  let symbols = allSymbols.filter(i => !i.isStatic);
  let staticSymbols = allSymbols.filter(i => i.isStatic);

  let allProperties = items.filter(i => i.type === 'property');
  let protoProperties = allProperties.filter(i => !i.isStatic);
  let staticProperties = allProperties.filter(i => i.isStatic);

  // early error for duplicate symbols
  function firstDuplicate(xs) {
    let s = new Set;
    for (let i = 0; i < xs.length; ++i) {
      let x = xs[i];
      if (s.has(x)) return x;
      s.add(x);
    }
  }
  let dupSymbol = firstDuplicate(allSymbols.map(i => unwrap(i.name).value));
  if (dupSymbol != null) throw new Error('interface "' + unwrap(interfaceName).value + '" declares symbol named "' + dupSymbol + '" more than once');

  if (staticProperties.some(i => isIdentifier(i.name) && unwrap(i.name).value === 'prototype')) {
    throw new Error('illegal static property named "prototype"');
  }

  if (protoProperties.some(i => isIdentifier(i.name) && unwrap(i.name).value === 'constructor')) {
    throw new Error('illegal prototype property named "constructor"');
  }

  return #`
  const ${interfaceName} = new Protocol({
    name: ${fromStringLiteral(here, unwrap(interfaceName).value)},
    extends: [${join(extendsClause.map(e => #`${e},`))}],
    symbols: {
      ${join(symbols.map(sym => {
        let description = fromStringLiteral(here, unwrap(interfaceName).value + '.' + unwrap(sym.name).value);
        return #`${sym.name}: Symbol(${description}),`;
      }))}
    },
    staticSymbols: {
      ${join(staticSymbols.map(sym => {
        let description = fromStringLiteral(here, 'static ' + unwrap(interfaceName).value + '.' + unwrap(sym.name).value);
        return #`${sym.name}: Symbol(${description}),`;
      }))}
    },
    protoProperties: Object.getOwnPropertyDescriptors({
      ${join(protoProperties.map(p => {
        let getSetPrefix = p.descType === 'get' ? #`get` : p.descType === 'set' ? #`set` : #``;
        return #`${getSetPrefix} ${p.name} ${p.parens} ${p.body},`;
      }))}
    }),
    staticProperties: Object.getOwnPropertyDescriptors({
      ${join(staticProperties.map(p => {
        let getSetPrefix = p.descType === 'get' ? #`get` : p.descType === 'set' ? #`set` : #``;
        return #`${getSetPrefix} ${p.name} ${p.parens} ${p.body},`;
      }))}
    }),
  });
  `;
}

export syntax class = ctx => {
  function join(ts) {
    return ts.reduce((accum, t) => accum.concat(t), #``);
  }

  let className = matchIdentifier(ctx);
  let extendsClause = matchClassExtendsClause(ctx);
  let implementsClauses = matchImplements(ctx);
  let classBody = matchBraces(ctx);

  let _extends = extendsClause.length === 1 ? #`extends ${extendsClause[0]}` : #``;

  return #`
    class ${className} ${_extends} ${classBody}
    ${implementsClauses.length > 0
      ? #`Protocol.implement(${className}${join(implementsClauses.map(i => #`, ${i.value}`))})`
      : #``
    }
  `
}

export operator implements left 5 = (left, right) => {
  return #`((left, right) => right._isImplementedBy(left))(${left}, ${right})`;
};
