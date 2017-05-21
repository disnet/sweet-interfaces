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
      return acc.concat(#`${item.name}: { value: Symbol(),
        writable: false, configurable: false, enumerable: true },`);
    } else {
      return acc.concat(#`${item.name}: { value: function ${item.parens} ${item.body},
        writable: false, configurable: false, enumerable: true },`);
    }
  }, #``);

  let staticsArr = items.reduce((acc, item) => {
    if (item.type === 'static') {
      return acc.concat(#`${fromStringLiteral(item.name, unwrap(item.name).value)}, `)
    }
    return acc;
  }, #``);
  let statics = #`_statics: {
    value: [${staticsArr}],
    configurable: false, writable: false, enumerable: false
  },`;

  let mixin = #`_mixin: { value: function(klass) {
    for (let s in this) {
      if (typeof this[s] === 'symbol' && this._statics.includes(s)) {
        klass[this[s]] = void 0;
      } else if (typeof this[s] === 'symbol') {
        klass.prototype[this[s]] = void 0;
      } else {
        klass.prototype[s] = this[s];
      }
    }
  }, configurable: false, writable: false, enumerable: false},`;

  let extArgs = extendsClause.reduce((acc, e) => acc.concat(#`, ${e.name}`), #``);
  let ext = extendsClause.length === 0 ? #`` : #`Object.assign(${name} ${extArgs});`;

  return #`
    const ${name} = Object.create(null, {
      ${fields}
      ${mixin}
      ${statics}
    });
    ${ext}
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
