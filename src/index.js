'lang sweet.js';
import { matchImplements, matchExtendsClause, matchAny, matchInterfaceItems, matchIdentifier, matchBraces } from './match-util' for syntax;
import { unwrap, fromStringLiteral } from '@sweet-js/helpers' for syntax;

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
    if (item.type === 'field' || item.type === 'static') {
      return acc.concat(#`${item.name}: { value: Symbol(${fromStringLiteral(item.name, unwrap(name).value + '.' + unwrap(item.name).value)}),
        writable: false, configurable: false, enumerable: true },`);
    } else {
      return acc.concat(#`${item.name}: { value: function ${item.parens} ${item.body},
        writable: false, configurable: false, enumerable: true },`);
    }
  }, #``);

  let staticsArr = items.reduce((acc, item) => {
    if (item.type === 'static') {
      return acc.concat(#`${fromStringLiteral(item.name, unwrap(item.name).value)},`)
    }
    return acc;
  }, #``);
  let statics = #`_statics: {
    value: [${staticsArr}],
    configurable: false, writable: false, enumerable: false
  },`;

  let extArr = extendsClause.reduce((acc, e) => acc.concat(#`${e.name},`), #``);
  let superclasses = #`_superclasses: {
    value: [${extArr}],
    configurable: false, writable: false, enumerable: false
  },`;

  let mixin = #`_mixin: { value: function (klass) {
    this._superclasses.forEach(s => { s._mixin(klass); });
    ${items
      .filter(i => i.type === 'field')
      .reduce((acc, i) => acc.concat(#`if (klass.prototype[${name}.${i.name}] == null) throw new Error(${name}.${i.name}.toString() + ' not implemented');`), #``)
    }
    ${items
      .filter(i => i.type === 'static')
      .reduce((acc, i) => acc.concat(#`if (klass[${name}.${i.name}] == null) throw new Error(${name}.${i.name}.toString() + ' not implemented');`), #``)
    }
    // TODO: support static methods
    ${items
      .filter(i => i.type === 'method')
      .reduce((acc, i) => acc.concat(#`klass.prototype.${i.name} = this.${i.name};`), #``)
    }
    return klass;
  }, configurable: false, writable: false, enumerable: false},`;

  return #`
    const ${name} = Object.create(null, {
      ${fields}
      ${mixin}
      ${superclasses}
      ${statics}
    });
  `;
}

export syntax class = ctx => {
  let name = matchIdentifier(ctx);
  let impl = matchImplements(ctx);
  let extendsClause = matchExtendsClause(ctx);
  let body = matchBraces(ctx);

  let extendsStx = extendsClause.length === 1 ? #`extends ${extendsClause[0].name}` : #``;
  let implStx = impl.value == null ? #`` : #`${impl.value}._mixin(${name});`

  return #`
    class ${name} ${extendsStx} ${body}
    ${implStx}
  `
}

export operator implements left 5 = (left, right) => {
  return #`${right}._mixin(${left})`;
};
