import test from 'ava';
import { compileAndEval, compile } from './_compile';

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


test('an unimplemented interface throws', t => {
  let code = compile(`
    interface I { a; }
    class C implements I {}
  `);
  t.throws(() => { eval(code); });
});

test('an unimplemented interface throws', t => {
  let code = compile(`
    interface I { static a; }
    class C implements I {}
  `);
  t.throws(() => { eval(code); });
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

test('minimal implementations', t => {
  t.deepEqual({ c: 'function', d: 'function' }, compileAndEval(`
    interface Functor { map; }
    interface Applicative extends Functor { pure; apply; }
    interface Monad extends Applicative { bind; join; kleisli() {} }
    interface MonadViaBind extends Monad {
      [Monad.join]() {}
    }
    interface MonadViaJoin extends Monad {
      [Monad.bind]() {}
    }
    class C implements MonadViaBind {
      [Functor.map]() {}
      [Applicative.pure]() {}
      [Applicative.apply]() {}
      [Monad.bind]() {}
    }
    class D implements MonadViaJoin {
      [Functor.map]() {}
      [Applicative.pure]() {}
      [Applicative.apply]() {}
      [Monad.join]() {}
    }
    return {
      c: typeof C.prototype.kleisli,
      d: typeof D.prototype.kleisli,
    };
  `));
});

// TODO: interleave static/proto methods
test('evaluation order is preserved', t => {
  t.deepEqual({
    c0: 0,
    c1: 1,
    c3: 3,
    c4: 4,
    d0: 0,
    d1: 1,
    e3: 3,
    e4: 4,
    tc0: "function",
    tc1: "function",
    tc3: "function",
    tc4: "function",
    td0: "function",
    td1: "function",
    te3: "function",
    te4: "function",
  }, compileAndEval(`
    let counter = 0;
    interface I {
      a;
      [counter++]() { return 0; }
      [counter++]() { return 1; }
    }
    interface K extends (counter++, I) {
      b;
      [counter++]() { return 3; }
      [counter++]() { return 4; }
    }
    class C implements I, K {
      [I.a]() {}
      [K.b]() {}
    }
    class D implements I {
      [I.a]() {}
    }
    class E implements K {
      [I.a]() {}
      [K.b]() {}
    }
    let c = new C;
    let d = new D;
    let e = new E;
    return {
      tc0: typeof c[0],
      tc1: typeof c[1],
      c0: c[0](),
      c1: c[1](),
      tc3: typeof c[3],
      tc4: typeof c[4],
      c3: c[3](),
      c4: c[4](),

      td0: typeof d[0],
      td1: typeof d[1],
      d0: d[0](),
      d1: d[1](),

      te3: typeof e[3],
      te4: typeof e[4],
      e3: e[3](),
      e4: e[4](),
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

test('implements operator chaining', t => {
  t.deepEqual({ a: 'function', b: 'function', f: 'function', g: 'function' }, compileAndEval(`
    interface I {
      a;
      f() {}
    }
    interface K {
      b;
      g() {}
    }
    class C {
      [I.a]() {}
      [K.b]() {}
    }
    C implements I implements K;
    let c = new C;
    return {
      a: typeof c[I.a],
      b: typeof c[K.b],
      f: typeof c.f,
      g: typeof c.g,
    };
  `));
});
