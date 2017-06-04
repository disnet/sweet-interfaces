'lang sweet.js';
import { matchImplements, matchExtendsClause, matchAny, matchInterfaceItems, matchIdentifier, matchBraces } from './match-util' for syntax;
import { isIdentifier, isKeyword, isStringLiteral, isNumericLiteral, isBrackets, unwrap, fromStringLiteral } from '@sweet-js/helpers' for syntax;

/*
TODO:
- what do we do about extending interfaces that conflict?
- do we actually need to put the symbols on the prototype?
*/

export syntax interface = ctx => {

  function memberAccess(p) {
    if (isIdentifier(p) || isKeyword(p)) {
      return #`.`.concat(p);
    } else if (isStringLiteral(p) || isNumericLiteral(p)) {
      return #`[${p}]`;
    } else if (isBrackets(p)) {
      return p;
    }
    throw new Error('Unrecognised property name');
  }

  function join(ts) {
    return ts.reduce((accum, t) => accum.concat(t), #``);
  }

  let name = matchIdentifier(ctx);
  let extendsClause = matchExtendsClause(ctx);
  let body = matchBraces(ctx);
  let inner = ctx.contextify(body);
  let items = matchInterfaceItems(inner);

  let fieldDecls = [];
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
      case 'static method':
        fieldDecls.push(#`${i.name}: {
          value: function ${i.parens} ${i.body},
          writable: false, configurable: false, enumerable: true,
        },`);
    }
  });

  let superclasses = #`_extends: {
    value: [${join(extendsClause.map(e => #`${e.value},`))}],
    configurable: false, writable: false, enumerable: false
  },`;

  let fieldChecks = [], staticFieldChecks = [], methodDecls = [], staticMethodDecls = [];

  items.forEach(i => {
    switch (i.type) {
      case 'field':
        fieldChecks.push(#`if (klass.prototype[${name}.${i.name}] == null) throw new Error(${name}.${i.name}.toString() + ' not implemented by ' + klass);`);
        break;
      case 'static field':
        staticFieldChecks.push(#`if (klass[${name}.${i.name}] == null) throw new Error(${name}.${i.name}.toString() + ' not implemented by ' + klass);`);
        break;
      case 'method': {
        let p = memberAccess(i.name);
        methodDecls.push(#`klass.prototype ${p} = this ${p};`);
        break;
      }
      case 'static method': {
        let p = memberAccess(i.name);
        methodDecls.push(#`klass ${p} = this ${p};`);
        break;
      }
    }
  });

  let mixin = #`_mixin: { value: function (klass) {
    ${join(fieldChecks)}
    ${join(staticFieldChecks)}
    ${join(methodDecls)}
    ${join(staticMethodDecls)}
    this._extends.forEach(s => { s._mixin(klass); });
    return klass;
  }, configurable: false, writable: false, enumerable: false},`;

  return #`
    const ${name} = Object.create(null, {
      ${join(fieldDecls)}
      ${mixin}
      ${superclasses}
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
