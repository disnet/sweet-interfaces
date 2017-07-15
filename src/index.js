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
    let fieldName = fromStringLiteral(stx, unwrap(name).value + '.' + symbolDesc);
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
  const ${name} = (function() {
    if (typeof Reflect !== 'undefined' && typeof Reflect.implement === 'undefined') {
      Reflect.implement = function(C, ...is) {
        is.forEach(i => i._mixin(C));
        return C;
      };
    }

    const _extends = [${join(_extends)}];
    ${join(cachedFieldNames)}
    return Object.create(null, {
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
      _check: { value: function (klass, staticIgnoring, protoIgnoring) {
        let inheritedFields = this._methods.map(m => this._fields[m.name]);
        let fieldsWhichMustBeImplemented = Object.values(this._fields).filter(n => !inheritedFields.includes(n));
        for (let field of fieldsWhichMustBeImplemented) {
          let target = field.isStatic ? klass : klass.prototype;
          let ignoring = field.isStatic ? staticIgnoring : protoIgnoring;
          if (!ignoring.map(i => i.name).includes(field.value) && target[field.value] == null) {
            throw new Error(field.value.toString() + ' not implemented by ' + klass);
          }
        }
        this._extends.forEach(s => { s._check(klass, staticIgnoring, protoIgnoring); });
      }, configurable: false, writable: false, enumerable: false},
      _collect: { value: function (fn) {
        return [...fn(this), ...[].concat.apply([], this._extends.map(i => i._collect(fn)))];
      }, configurable: false, writable: false, enumerable: false},
      _mixin: { value: function (klass) {
        let fields = this._collect(i => [i._fields])
          .reduceRight((allFields, fields) => Object.assign(allFields, fields), {});
        this._check(
          klass,
          this._collect(i => i._methods.filter(m => m.isStatic).map(m => fields[m.name])),
          this._collect(i => i._methods.filter(m => !m.isStatic).map(m => fields[m.name])),
        );
        let methods = this._collect(i => i._methods);
        methods.forEach(m=> {
          let target = m.isStatic ? klass : klass.prototype;
          let name = fields[m.name].value;
          if ({}.hasOwnProperty.call(target, name)) return;
          Object.defineProperty(
            target,
            name,
            { value: m.value, configurable: true, writable: true, enumerable: m.isStatic }
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
  return #`(function(left, right){
    try {
      right._check(left, [], []);
      return true;
    } catch (ignored) {
      return false;
    }
  }(${left}, ${right}))`;
};
