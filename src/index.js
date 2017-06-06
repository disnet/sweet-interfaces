'lang sweet.js';
import { matchImplements, matchClassExtendsClause, matchInterfaceExtendsClause, matchAny, matchInterfaceItems, matchIdentifier, matchBraces } from './match-util' for syntax;
import { isIdentifier, isKeyword, isStringLiteral, isNumericLiteral, isBrackets, unwrap, fromStringLiteral } from '@sweet-js/helpers' for syntax;

/*
TODO:
- what do we do about extending interfaces that conflict?
- do we actually need to put the symbols on the prototype?
*/

export syntax interface = ctx => {
  function join(ts) {
    return ts.reduce((accum, t) => accum.concat(t), #``);
  }

  let name = matchIdentifier(ctx);
  let extendsClause = matchInterfaceExtendsClause(ctx);
  let body = matchBraces(ctx);
  let inner = ctx.contextify(body);
  let items = matchInterfaceItems(inner);

  let fields = items.filter(i => i.type === 'field');
  let methods = items.filter(i => i.type === 'method');

  // early error for duplicate fields
  function firstDuplicate(xs) {
    let s = new Set;
    for (let i = 0; i < xs.length; ++i) {
      let x = xs[i];
      if (s.has(x)) return x;
      s.add(x);
    }
  }
  let dupField = firstDuplicate(fields.map(i => unwrap(i.name).value));
  if (dupField != null) throw new Error('interface "' + unwrap(name).value + '" declares field nameed "' + dupField + '" more than once');

  if (items.some(i => i.type === 'method' && i.isStatic && isIdentifier(i.name) && unwrap(i.name).value === 'prototype')) {
    throw new Error('illegal static method named "prototype"');
  }

  if (items.some(i => i.type === 'method' && !i.isStatic && isIdentifier(i.name) && unwrap(i.name).value === 'constructor')) {
    throw new Error('illegal prototype method named "constructor"');
  }

  function toDefinePropertyString(p) {
    if (isIdentifier(p) || isKeyword(p)) {
      return fromStringLiteral(p, unwrap(p).value);
    } else if (isBrackets(p)) {
      // HACK
      return #`${p}[0]`;
    }
    return p;
  }

  let fieldDescriptors = fields.map(i => {
    let fieldName = fromStringLiteral(i.name, unwrap(name).value + '.' + unwrap(i.name).value);
    return #`${i.name}: {
      value: Symbol(${fieldName}),
      writable: false, configurable: false, enumerable: true,
    },`;
  });

  let methodDescriptors = methods.map(i => #`{
    isStatic: ${i.isStatic ? #`true` : #`false`},
    name: ${toDefinePropertyString(i.name)},
    value: function ${i.parens} ${i.body}
  },`);

  let fieldChecks = fields.map(i => #`
    if (klass ${i.isStatic ? #`` : #`.prototype`}[${name}.${i.name}] == null) {
      throw new Error(${name}.${i.name}.toString() + ' not implemented by ' + klass);
    }
  `);

  let _extends = extendsClause.map(e => #`${e},`);

  return #`
    const ${name} = Object.create(null, {
      ${join(fieldDescriptors)}
      _extends: {
        value: [${join(_extends)}],
        configurable: false, writable: false, enumerable: false
      },
      _methods: {
        value: [${join(methodDescriptors)}],
        configurable: false, writable: false, enumerable: false
      },
      _mixin: { value: function (klass) {
        ${join(fieldChecks)}
        this._methods.forEach(m => {
          let target = m.isStatic ? klass : klass.prototype;
          if ({}.hasOwnProperty.call(target, m.name)) return;
          Object.defineProperty(
            target,
            m.name,
            { value: m.value, configurable: true, writable: true, enumerable: m.isStatic }
          );
        });
        this._extends.forEach(s => { s._mixin(klass); });
        return klass;
      }, configurable: false, writable: false, enumerable: false},
    });
  `;
}

export syntax class = ctx => {
  function join(ts) {
    return ts.reduce((accum, t) => accum.concat(t), #``);
  }

  let name = matchIdentifier(ctx);
  let extendsClause = matchClassExtendsClause(ctx);
  let impl = matchImplements(ctx);
  let body = matchBraces(ctx);

  let _extends = extendsClause.length === 1 ? #`extends ${extendsClause[0]}` : #``;

  return #`
    class ${name} ${_extends} ${body}
    ${join(impl.map(i => #`(${i.value})._mixin(${name});`))}
  `
}

export operator implements left 5 = (left, right) => {
  return #`${right}._mixin(${left})`;
};
