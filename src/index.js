'lang sweet.js';
import { matchImplements, matchExtendsClause, matchAny, matchInterfaceItems, matchIdentifier, matchBraces } from './match-util' for syntax;
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
  let extendsClause = matchExtendsClause(ctx);
  let body = matchBraces(ctx);
  let inner = ctx.contextify(body);
  let items = matchInterfaceItems(inner);

  // early error for duplicate fields
  function firstDuplicate(xs) {
    let s = new Set;
    for (let i = 0; i < xs.length; ++i) {
      let x = xs[i];
      if (s.has(x)) return x;
      s.add(x);
    }
  }
  let dupField = firstDuplicate(items.filter(i => i.type === 'field').map(i => unwrap(i.name).value));
  if (dupField != null) throw new Error('interface "' + unwrap(name).value + '" declares field "' + dupField + '" more than once');
  let dupStaticField = firstDuplicate(items.filter(i => i.type === 'static field').map(i => unwrap(i.name).value));
  if (dupStaticField != null) throw new Error('interface "' + unwrap(name).value + '" declares static field "' + dupStaticField + '" more than once');

  let fieldDecls = [], methodDecls = [], staticMethodDecls = [];
  items.forEach(i => {
    switch (i.type) {
      case 'field':
      case 'static field': {
        let fieldName = fromStringLiteral(i.name, unwrap(name).value + '.' + unwrap(i.name).value);
        fieldDecls.push(#`${i.name}: {
          value: Symbol(${fieldName}),
          writable: false, configurable: false, enumerable: true,
        },`);
        break;
      }
      case 'method':
        methodDecls.push(#`${i.name}: {
          value: function ${i.parens} ${i.body},
          writable: false, configurable: false, enumerable: true,
        },`);
        break;
      case 'static method':
        staticMethodDecls.push(#`${i.name}: {
          value: function ${i.parens} ${i.body},
          writable: false, configurable: false, enumerable: true,
        },`);
        break;
    }
  });

  let fieldChecks = [], staticFieldChecks = [];

  items.forEach(i => {
    switch (i.type) {
      case 'field':
        fieldChecks.push(#`if (klass.prototype[${name}.${i.name}] == null) throw new Error(${name}.${i.name}.toString() + ' not implemented by ' + klass);`);
        break;
      case 'static field':
        staticFieldChecks.push(#`if (klass[${name}.${i.name}] == null) throw new Error(${name}.${i.name}.toString() + ' not implemented by ' + klass);`);
        break;
    }
  });

  return #`
    const ${name} = Object.create(null, {
      ${join(fieldDecls)}
      _extends: {
        value: [${join(extendsClause.map(e => #`${e.value},`))}],
        configurable: false, writable: false, enumerable: false
      },
      _methods: { value: Object.create(null, { ${join(methodDecls)} }), configurable: false, writable: false, enumerable: false },
      _staticMethods: { value: Object.create(null, { ${join(staticMethodDecls)} }), configurable: false, writable: false, enumerable: false },
      _mixin: { value: function (klass) {
        ${join(fieldChecks)}
        ${join(staticFieldChecks)}
        Object.assign(klass.prototype, this._methods);
        Object.assign(klass, this._staticMethods);
        this._extends.forEach(s => { s._mixin(klass); });
        return klass;
      }, configurable: false, writable: false, enumerable: false},
    });
  `;
}

export syntax class = ctx => {
  let name = matchIdentifier(ctx);
  let extendsClause = matchExtendsClause(ctx);
  let impl = matchImplements(ctx);
  let body = matchBraces(ctx);

  let extendsStx = extendsClause.length === 1 ? #`extends ${extendsClause[0].value}` : #``;
  let implStx = impl.reduce((acc, i) => acc.concat(#`(${i.value})._mixin(${name});`), #``);

  return #`
    class ${name} ${extendsStx} ${body}
    ${implStx}
  `
}

export operator implements left 5 = (left, right) => {
  return #`${right}._mixin(${left})`;
};
