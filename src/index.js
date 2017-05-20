'lang sweet.js';
import { matchAny, matchInterfaceItems, matchIdentifier, matchBraces } from './match-util' for syntax;

export syntax interface = ctx => {
  let name = matchIdentifier(ctx);
  let body = matchBraces(ctx);
  let inner = ctx.contextify(body);
  let items = matchInterfaceItems(inner);
  let fields = items.reduce((acc, item) => {
    if (item.type === 'field') {
      return acc.concat(#`${item.name}: Symbol(),`);
    } else {
      return acc.concat(#`${item.name} ${item.parens} ${item.body},`);
    }
  }, #``);

  let mixinBody = items.reduce((acc, item) => acc.concat(#`klass.prototype = this.${item.name}`) , #``);

  return #`
    const ${name} = {
      ${fields}
      _mixin(klass) {
        ${mixinBody}
      }
    };
  `;
}

export syntax class = ctx => {
  let name = matchIdentifier(ctx);
  matchAny('implements', ctx);
  let impl = matchIdentifier(ctx);
  let body = matchBraces(ctx);

  return #`
    class ${name} ${body}
    ${impl}._mixin(${name});
  `
}
