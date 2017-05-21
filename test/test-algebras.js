import test from 'ava';
import { compileAndEval } from './_compile';

test('a class can implement an interface with a single property', t => {
  let output = compileAndEval(`'lang sweet.js';
import { class, interface } from '../src/index';
interface I {
  a;
}
class C implements I { }
let c = new C;
output = {
  type: typeof I.a,
  hasa: I.a in c
};
  `);
  t.deepEqual(output, { type: 'symbol', hasa: true });
});

test('a class can implement an interface with a single static property', t => {
  let output = compileAndEval(`'lang sweet.js';
import { class, interface } from '../src/index';
interface I {
  static a;
}
class C implements I { }
output = {
  type: typeof I.a,
  hasa: I.a in C
};
  `);
  t.deepEqual(output, { type: 'symbol', hasa: true });
});

test('a class can implement an interface that extends multiple interfaces', t => {
  let output = compileAndEval(`'lang sweet.js';
import { class, interface } from '../src/index';
interface I {
  a;
}
interface J {
  b;
}
interface K extends I extends J {}
class C implements K { }
let c = new C;
output = {
  hasa: I.a in c,
  hasb: J.b in c
};
  `);
  t.deepEqual(output, { hasa: true, hasb: true });
});

test('a class can implement an interface that extends multiple interfaces with methods', t => {
  let output = compileAndEval(`'lang sweet.js';
import { class, interface } from '../src/index';
interface I {
  a;
  f() { return 'f'; }
}
interface J {
  b;
  g() { return 'g'; }
}
interface K extends I extends J {}
class C implements K { }
let c = new C;
output = {
  hasf: c.f(),
  hasg: c.g()
};
  `);
  t.deepEqual(output, { hasf: 'f', hasg: 'g' });
});
