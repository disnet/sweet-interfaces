import { compile as sweet } from '@sweet-js/core';
import NodeLoader from '@sweet-js/core/dist/node-loader';
import { transform } from 'babel-core';
import { writeFileSync, readFileSync } from 'fs';
import { fileSync } from 'tmp';

const POLYFILL = 'require(' + JSON.stringify(require.resolve('proposal-first-class-protocols/auto')) + ');';

export function compileAndEval(code) {
  return eval(compile(code));
}

export function compileTopLevel(code) {
  code = `'lang sweet.js'; import { class, protocol, implements } from '../'; ${POLYFILL}\n; ${code}`;
  let outFile = fileSync({ dir: __dirname });
  writeFileSync(outFile.fd, code);

  let loader = new NodeLoader(__dirname);
  return transform(sweet(outFile.name, loader).code, {"plugins": ["transform-es2015-modules-commonjs"]}).code;
}

export function compile(code) {
  return compileTopLevel(`(function() { ${code} }());`);
}
