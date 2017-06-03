'lang sweet.js';
import { matchImplements, matchExtendsClause, matchAny, matchInterfaceItems, matchIdentifier, matchBraces } from './match-util' for syntax;
import { isIdentifier, isKeyword, isStringLiteral, isNumericLiteral, isBrackets, unwrap, fromStringLiteral } from '@sweet-js/helpers' for syntax;

/*
TODO:
- what do we do about extending interfaces that conflict?
- do we actually need to put the symbols on the prototype?
*/

export syntax interface = ctx => {
  let name = matchIdentifier(ctx);
  let extendsClause = matchExtendsClause(ctx);
  let body = matchBraces(ctx);
  let inner = ctx.contextify(body);
  let items = matchInterfaceItems(inner);
  let fields = items.reduce((acc, item) => {
    if (item.type === 'field' || item.type === 'static field') {
      return acc.concat(#`${item.name}: { value: Symbol(${fromStringLiteral(item.name, unwrap(name).value + '.' + unwrap(item.name).value)}),
        writable: false, configurable: false, enumerable: true },`);
    } else {
      return acc.concat(#`${item.name}: { value: function ${item.parens} ${item.body},
        writable: false, configurable: false, enumerable: true },`);
    }
  }, #``);

  let extArr = extendsClause.reduce((acc, e) => acc.concat(#`${e.value},`), #``);
  let superclasses = #`_superclasses: {
    value: [${extArr}],
    configurable: false, writable: false, enumerable: false
  },`;

  let mixin = #`_mixin: { value: function (klass) {
    ${items
      .filter(i => i.type === 'field')
      .reduce((acc, i) => acc.concat(#`if (klass.prototype[${name}.${i.name}] == null) throw new Error(${name}.${i.name}.toString() + ' not implemented');`), #``)
    }
    ${items
      .filter(i => i.type === 'static field')
      .reduce((acc, i) => acc.concat(#`if (klass[${name}.${i.name}] == null) throw new Error(${name}.${i.name}.toString() + ' not implemented');`), #``)
    }
    ${items
      .filter(i => i.type === 'method')
      .map(i => i.name)
      .map(function memberAccess(p) {
          if (isIdentifier(p) || isKeyword(p)) {
            return #`.`.concat(p);
          } else if (isStringLiteral(p) || isNumericLiteral(p)) {
            return #`[${p}]`;
          } else if (isBrackets(p)) {
            return p;
          }
          throw new Error('Unrecognised property name');
        })
      .reduce((acc, i) => acc.concat(#`klass.prototype ${i} = this ${i};`), #``)
    }
    ${items
      .filter(i => i.type === 'static method')
      .map(i => i.name)
      .map(function memberAccess(p) {
          if (isIdentifier(p) || isKeyword(p)) {
            return #`.`.concat(p);
          } else if (isStringLiteral(p) || isNumericLiteral(p)) {
            return #`[${p}]`;
          } else if (isBrackets(p)) {
            return p;
          }
          throw new Error('Unrecognised property name');
        })
      .reduce((acc, i) => acc.concat(#`klass ${i} = this ${i};`), #``)
    }
    this._superclasses.forEach(s => { s._mixin(klass); });
    return klass;
  }, configurable: false, writable: false, enumerable: false},`;

  return #`
    const ${name} = Object.create(null, {
      ${fields}
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
