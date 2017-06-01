import test from 'ava';
import { compileAndEval } from './_compile';

test('a class can implement an interface with a single property', t => {
  let output = compileAndEval(`'lang sweet.js';
import { class, interface } from '../src/index';
interface I {
  a;
  b(){}
}
class C implements I {
  [I.a](){}
}
let c = new C;
output = {
  type: typeof I.a,
  hasa: I.a in c,
  hasb: 'b' in c,
};
  `);
  t.deepEqual({ type: 'symbol', hasa: true, hasb: true }, output);
});

test('a class can implement an interface with a single static property', t => {
  let output = compileAndEval(`'lang sweet.js';
import { class, interface } from '../src/index';
interface I {
  static a;
  b(){}
  // TODO: static c(){}
}
class C implements I {
  static [I.a]() {}
}
output = {
  type: typeof I.a,
  hasa: I.a in C,
  hasb: 'b' in C.prototype,
};
  `);
  t.deepEqual({ type: 'symbol', hasa: true, hasb: true }, output);
});

test('a class can implement an interface that extends multiple interfaces', t => {
  let output = compileAndEval(`'lang sweet.js';
import { class, interface } from '../src/index';
interface I {
  a;
  c(){}
}
interface J {
  b;
  d(){}
}
interface K extends I extends J {}
class C implements K {
  [I.a](){}
  [J.b](){}
}
let c = new C;
output = {
  hasc: 'c' in c,
  hasd: 'd' in c,
};
  `);
  t.deepEqual(output, { hasc: true, hasd: true });
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
class C implements K {
  [I.a](){}
  [J.b](){}
}
let c = new C;
output = {
  hasf: c.f(),
  hasg: c.g()
};
  `);
  t.deepEqual(output, { hasf: 'f', hasg: 'g' });
});

test('implements operator', t => {
  let output = compileAndEval(`'lang sweet.js';
import { interface, implements } from '../src/index';
interface I {
  a;
  f() { return this[I.a](); }
}
class C {
  constructor() { this.x = 0; }
  [I.a]() { return 'success'; }
}
C implements I;
let c = new C;
output = c.f();
  `);
  t.deepEqual(output, 'success');
});
