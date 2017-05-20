'lang sweet.js';
import { matchImplements, matchExtendsClause, matchAny, matchInterfaceItems, matchIdentifier, matchBraces } from './match-util' for syntax;

export syntax interface = ctx => {
  let name = matchIdentifier(ctx);
  let extendsClause = matchExtendsClause(ctx);
  let body = matchBraces(ctx);
  let inner = ctx.contextify(body);
  let items = matchInterfaceItems(inner);
  let fields = items.reduce((acc, item) => {
    if (item.type === 'field') {
      return acc.concat(#`${item.name}: { value: Symbol(), writable: false, configurable: false, enumerable: true },`);
    } else {
      return acc.concat(#`${item.name}: { value: function ${item.parens} ${item.body}, writable: false, configurable: false, enumerable: true },`);
    }
  }, #``);

  let mixin = #`_mixin: { value: function(klass) {
    Object.assign(klass, this);
  }, configurable: false, writable: false, enumerable: false},`;

  let extArgs = extendsClause.reduce((acc, e) => acc.concat(#`, ${e.name}`), #``);
  let ext = extendsClause.length === 0 ? #`` : #`Object.assign(${name} ${extArgs});`;

  return #`
    const ${name} = Object.create(null, {
      ${fields}
      ${mixin}
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
