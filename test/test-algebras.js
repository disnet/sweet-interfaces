import test from 'ava';
import { compileAndEval } from './_compile';

test('an interface is an object', t => {
  t.deepEqual('object', compileAndEval(`
    interface I {}
    return typeof I;
  `));
});

test('an interface can declare a symbol', t => {
  t.deepEqual('symbol', compileAndEval(`
    interface I {
      a;
    }
    return typeof I.a;
  `));
});

test('an interface can declare a static symbol', t => {
  t.deepEqual('symbol', compileAndEval(`
    interface I {
      static a;
    }
    return typeof I.a;
  `));
});

test('an interface can declare multiple symbols', t => {
  t.deepEqual({ a: 'symbol', b: 'symbol', c: 'symbol' }, compileAndEval(`
    interface I {
      a; b;
      static c;
    }
    return {
      a: typeof I.a,
      b: typeof I.b,
      c: typeof I.c,
    };
  `));
});


test('a class can implement an interface', t => {
  t.deepEqual('function', compileAndEval(`
    interface I {
      a;
      b(){}
    }
    class C implements I {
      [I.a](){}
    }
    return typeof C.prototype.b;
  `));
});

test('a class can implement an interface with a static member', t => {
  t.deepEqual('function', compileAndEval(`
    interface I {
      a;
      static b;
      c(){}
    }
    class C implements I {
      [I.a](){}
      static [I.b](){}
    }
    return typeof C.prototype.c;
  `));
});

test('a class can get a static member from an interface', t => {
  t.deepEqual('function', compileAndEval(`
    interface I {
      a;
      static b(){}
    }
    class C implements I {
      [I.a](){}
    }
    return typeof C.b;
  `));
});

test('a class can implement multiple interfaces', t => {
  t.deepEqual({ b: 'function', c: 'function' }, compileAndEval(`
    interface I {
      a;
      b(){}
    }
    interface J {
      b;
      c(){}
    }
    class C implements I, J {
      [I.a](){}
      [J.b](){}
    }
    return {
      b: typeof C.prototype.b,
      c: typeof C.prototype.c,
    };
  `));
});


test('interfaces can extend other interfaces', t => {
  t.deepEqual({ c: 'function', d: 'function' }, compileAndEval(`
    interface I {
      a;
      c(){}
    }
    interface J {
      b;
      d(){}
    }
    interface K extends I, J {}
    class C implements K {
      [I.a](){}
      [J.b](){}
    }
    return {
      c: typeof C.prototype.c,
      d: typeof C.prototype.d,
    };
  `));
});


test('implements operator', t => {
  t.deepEqual('success', compileAndEval(`
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
    return c.f();
  `));
});
