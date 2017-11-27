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

  let allRequires = items.filter(i => i.type === 'requires');
  let requires = allRequires.filter(i => !i.isStatic);
  let staticRequires = allRequires.filter(i => i.isStatic);

  let allProvides = items.filter(i => i.type === 'provides');
  allProvides.forEach((p, idx) => { p.index = idx; });
  let provides = allProvides.filter(i => !i.isStatic);
  let staticProvides = allProvides.filter(i => i.isStatic);

  // early error for duplicate required symbols
  function firstDuplicate(xs) {
    let s = new Map;
    for (let i = 0; i < xs.length; ++i) {
      let { descType, name } = xs[i];
      let val = [];
      if (s.has(name)) {
        val = s.get(name);
        switch (descType) {
          case 'get':
          case 'set':
            if (val.includes(descType)) return name;
            break;
          default:
            return name;
        }
      }
      val.push(descType);
      s.set(name, val);
    }
  }
  let dupSymbol = firstDuplicate(items.map(i => { return { descType: i.descType, name: unwrap(i.name).value }; }));
  if (dupSymbol != null) throw new Error('interface "' + unwrap(interfaceName).value + '" declares symbol named "' + dupSymbol + '" more than once');

  if (staticProvides.some(i => isIdentifier(i.name) && unwrap(i.name).value === 'prototype')) {
    throw new Error('illegal static property named "prototype"');
  }

  if (provides.some(i => isIdentifier(i.name) && unwrap(i.name).value === 'constructor')) {
    throw new Error('illegal prototype property named "constructor"');
  }

  let cachedPropertyNames = allProvides
    .filter(i => isBrackets(i.name))
    .map(i => {
      let identifier = fromIdentifier(here, '_propertyName' + i.index);
      // HACK (TODO: tim, take this out of brackets)
      return { identifier, value: #`${i.name}[0]` };
    });

  function usingCache(propertyName, index) {
    if (isBrackets(propertyName)) {
      return #`[${fromIdentifier(here, '_propertyName' + index)}]`.first();
    }
    return propertyName;
  }

  return #`
  const ${interfaceName} = (function(
    _extends,
    ${join(cachedPropertyNames.map(a => #`${a.identifier},`))}
    _unused
  ) {
    function nonEnumDescriptors(o) {
      let descs = Object.getOwnPropertyDescriptors(o);
      for (let p of Object.keys(descs)) {
        descs[p].enumerable = false;
      }
      return descs;
    }
    return new Protocol({
      name: ${fromStringLiteral(here, unwrap(interfaceName).value)},
      extends: _extends,
      requires: {
        ${join(requires.map(sym => {
          if (isStringLiteral(sym.name)) {
            return #`${sym.name}: ${sym.name},`;
          }
          let description = fromStringLiteral(here, unwrap(interfaceName).value + '.' + unwrap(sym.name).value);
          return #`${sym.name}: Symbol(${description}),`;
        }))}
      },
      staticRequires: {
        ${join(staticRequires.map(sym => {
          if (isStringLiteral(sym.name)) {
            return #`${sym.name}: ${sym.name},`;
          }
          let description = fromStringLiteral(here, 'static ' + unwrap(interfaceName).value + '.' + unwrap(sym.name).value);
          return #`${sym.name}: Symbol(${description}),`;
        }))}
      },
      provides: nonEnumDescriptors({
        ${join(provides.map(p => {
          let getSetPrefix = p.descType === 'get' ? #`get` : p.descType === 'set' ? #`set` : #``;
          return #`${getSetPrefix} ${usingCache(p.name, p.index)} ${p.parens} ${p.body},`;
        }))}
      }),
      staticProvides: nonEnumDescriptors({
        ${join(staticProvides.map(p => {
          let getSetPrefix = p.descType === 'get' ? #`get` : p.descType === 'set' ? #`set` : #``;
          return #`${getSetPrefix} ${usingCache(p.name, p.index)} ${p.parens} ${p.body},`;
        }))}
      }),
    })
  }(
    [${join(extendsClause.map(e => #`${e},`))}],
    ${join(cachedPropertyNames.map(a => #`${a.value},`))}
    0
  ));
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
