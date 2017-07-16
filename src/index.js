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
  if (dupField != null) throw new Error('interface "' + unwrap(interfaceName).value + '" declares field nameed "' + dupField + '" more than once');

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
      // HACK (TODO: tim, take this out of brackets)
      return #`${p}[0]`;
    }
    throw new Error('Not reached');
  }

  function toPropertyAccess(p) {
    if (isBrackets(p)) {
      return p;
    } else if (isIdentifier(p) || isKeyword(p)) {
      return #`.${p}`;
    }
    throw new Error('Not reached');
  }

  function isDelimiter(s) {
    return isParens(s) || isBrackets(s) || isBraces(s);
  }

  let cachedFieldNames = items
    .filter(i => !isIdentifier(i.name) && !isKeyword(i.name))
    .map(i => {
      let idx = items.indexOf(i);
      let stx = fromIdentifier(here, 'field' + idx);
      return #`const ${stx} = (${toDefinePropertyString(i.name)});`;
    });

  function usingCache(stx, idx) {
    if (isIdentifier(stx) || isKeyword(stx)) {
      return stx;
    }
    return #`[${fromIdentifier(here, 'field' + idx)}]`.first();
  }

  let fieldGetters = items.map((i, idx) => {
    return #`${usingCache(i.name, idx)}: {
      get: function() { return this._fields ${toPropertyAccess(usingCache(i.name, idx))}.value; },
      configurable: false, enumerable: true,
    },`;
  });

  let fieldDescriptors = items.map((i, idx) => {
    let symbolDesc;
    let stx;
    if (isBrackets(i.name)) {
      stx = i.name.inner.first();
      symbolDesc = i.name.inner.map(stx => {
        if (isDelimiter(stx)) {
          let startDelim = stx.inner.first().value;
          let endDelim = stx.inner.last().value;
          return `${startDelim}...${endDelim}`;
        }
        return unwrap(stx).value;
      }).join('');
    } else {
      stx = i.name;
      symbolDesc = unwrap(i.name).value;
    }
    let fieldName = fromStringLiteral(stx, unwrap(interfaceName).value + '.' + symbolDesc);
    let hasComputedName = !isIdentifier(i.name) && !isKeyword(i.name);
    return #`${usingCache(i.name, idx)}: {
      isStatic: ${i.isStatic ? #`true` : #`false`},
      name: ${toDefinePropertyString(usingCache(i.name, idx))},
      value: ${hasComputedName ? toDefinePropertyString(usingCache(i.name, idx)) : #`Symbol(${fieldName})`},
    },`;
  });
      // value: ${i.type === 'method' && !isIdentifier(i.name) && !isKeyword(i.name) ? toDefinePropertyString(usingCache(i.name, idx)) : #`Symbol(${fieldName})`},

  let methodDescriptors = methods.map(i => #`{
    isStatic: ${i.isStatic ? #`true` : #`false`},
    name: ${toDefinePropertyString(usingCache(i.name, items.indexOf(i)))},
    value: function ${i.parens} ${i.body},
  },`);
  let _extends = extendsClause.map(e => #`${e},`);

  return #`
  const ${interfaceName} = (function() {
    if (typeof Reflect !== 'undefined' && typeof Reflect.implement === 'undefined') {
      Reflect.implement = function(C, ...is) {
        is.forEach(i => i._mixin(C));
        return C;
      };
    }

    const _extends = [${join(_extends)}];
    ${join(cachedFieldNames)}
    return Object.create(null, {

      _name: {
        value: ${fromStringLiteral(interfaceName, unwrap(interfaceName).value)},
        configurable: false, writable: false, enumerable: false
      },

      ${join(fieldGetters)}

      _extends: {
        value: _extends,
        configurable: false, writable: false, enumerable: false
      },

      _fields: {
        value: {${join(fieldDescriptors)}},
        configurable: false, writable: false, enumerable: false
      },

      _methods: {
        value: [${join(methodDescriptors)}],
        configurable: false, writable: false, enumerable: false
      },

      _unimplemented: { value: function (klass) {
        let fieldsWhichWillBeInherited = this._collect(i => i._methods.map(m => i._fields[m.name].value));
        return this._collect(i => i._unimplementedHelper(klass, fieldsWhichWillBeInherited));
      }, configurable: false, writable: false, enumerable: false},

      _unimplementedHelper: { value: function (klass, fieldsWhichWillBeInherited) {
        let fieldsWhichMustBeImplemented = Object.values(this._fields);
        let unimplemented = [];
        for (let field of fieldsWhichMustBeImplemented) {
          let target = field.isStatic ? klass : klass.prototype;
          if (!(field.value in target) && !fieldsWhichWillBeInherited.includes(field.value)) {
            unimplemented.push(field);
          }
        }
        return unimplemented;
      }, configurable: false, writable: false, enumerable: false},

      _collect: { value: function (fn) {
        return [...fn(this), ...[].concat.apply([], this._extends.map(i => i._collect(fn)))];
      }, configurable: false, writable: false, enumerable: false},

      _mixin: { value: function (klass) {
        let allFields = this._collect(i => [i._fields])
          .reduceRight((memo, fs) => Object.assign(memo, fs), {});
        let unimplementedFieldNames = this._unimplemented(klass);
        if (unimplementedFieldNames.length > 0) {
          throw new Error(unimplementedFieldNames.map(f => f.value.toString()).join(', ') + ' not implemented by ' + klass);
        }
        let allMethods = this._collect(i => i._methods);
        // TODO: https://github.com/sweet-js/sweet-core/issues/733
        allMethods.forEach(({isStatic: isStatic, name: name, value: value}) => {
          let target = isStatic ? klass : klass.prototype;
          let symbol = allFields[name].value;
          if ({}.hasOwnProperty.call(target, symbol)) return;
          Object.defineProperty(
            target,
            symbol,
            { value, configurable: true, writable: true, enumerable: isStatic }
          );
        });
        return klass;
      }, configurable: false, writable: false, enumerable: false},
    });
  }());
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
    ${join(implementsClauses.map(i => #`(${i.value})._mixin(${className});`))}
  `
}

export operator implements left 5 = (left, right) => {
  return #`((left, right) => right._unimplementedHelper(left, []).length <= 0)(${left}, ${right})`;
};
