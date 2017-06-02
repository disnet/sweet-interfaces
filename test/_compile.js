import { compile } from '@sweet-js/core';
import NodeLoader from '@sweet-js/core/dist/node-loader';
import { transform } from 'babel-core';
import { writeFileSync, readFileSync } from 'fs';
import { fileSync } from 'tmp';

export function compileAndEval(code) {
  code = `'lang sweet.js';
import { class, interface, implements } from '../src/index';
output = (function() { ${code} }());`;

  let output;
  let outFile = fileSync({ dir: __dirname });
  writeFileSync(outFile.fd, code);

  let loader = new NodeLoader(__dirname);
  let res = transform(compile(outFile.name, loader).code, {"plugins": ["transform-es2015-modules-commonjs"]}).code;
  // console.log(res);
  eval(res);
  return output;
}
