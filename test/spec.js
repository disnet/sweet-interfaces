import test from 'ava';
import { compileAndEval, compileTopLevel, compile } from './_compile';

test('an interface is an object', t => {
  t.deepEqual('object', compileAndEval(`
    interface I {}
    return typeof I;
  `));
});

test('an interface has no prototype', t => {
  t.deepEqual(null, compileAndEval(`
    interface I {}
    return Object.getPrototypeOf(I);
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

test('an interface can be exported', t => {
  t.regex(compileTopLevel(`
    export interface INTERFACENAME { a; }
  `), /\bINTERFACENAME\b/);
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

test('a class can extend another and implement an interface', t => {
  t.deepEqual({ b: 'function', c: 'function', d: 'function', bA: true, bB: true }, compileAndEval(`
    interface I {
      a;
      b(){}
    }
    class A {
      [I.a]() {}
      c(){}
    }
    class B extends A implements I {
      d(){}
    }
    let b = new B;
    return {
      b: typeof b.c,
      c: typeof b.c,
      d: typeof b.d,
      bA: b instanceof A,
      bB: b instanceof B,
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

test('an unimplemented static interface throws', t => {
  let code = compile(`
    interface I { static a; }
    class C implements I {}
  `);
  t.throws(() => { eval(code); });
});

test('duplicate interface fields is early error', t => {
  t.throws(() => {
    compile(`interface I { a; b; a; }`);
  });
});

test('duplicate static interface fields is early error', t => {
  t.throws(() => {
    compile(`interface I { static a; static b; static a; }`);
  });
});

test('same name static and prototype fields is early error', t => {
  t.throws(() => {
    compile(`interface I { a; static a; }`);
  });
  t.throws(() => {
    compile(`interface I { static a; a; }`);
  });
});

test('static method named prototype is early error', t => {
  t.notThrows(() => {
    compile(`interface I { prototype; }`);
  });
  t.notThrows(() => {
    compile(`interface I { static prototype; }`);
  });
  t.notThrows(() => {
    compile(`interface I { prototype(){} }`);
  });
  t.throws(() => {
    compile(`interface I { static prototype(){} }`);
  });
});

test('proto method named constructor is early error', t => {
  t.notThrows(() => {
    compile(`interface I { constructor; }`);
  });
  t.notThrows(() => {
    compile(`interface I { static constructor; }`);
  });
  t.throws(() => {
    compile(`interface I { constructor(){} }`);
  });
  t.notThrows(() => {
    compile(`interface I { static constructor(){} }`);
  });
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

test('evaluation order is preserved', t => {
  t.deepEqual({
    c0: 0,
    c1: 1,
    c2: 2,
    c4: 4,
    c5: 5,
    c6: 6,
    d0: 0,
    d1: 1,
    d2: 2,
    e4: 4,
    e5: 5,
    e6: 6,
    tc0: "function",
    tc1: "function",
    tc2: "function",
    tc4: "function",
    tc5: "function",
    tc6: "function",
    td0: "function",
    td1: "function",
    td2: "function",
    te4: "function",
    te5: "function",
    te6: "function",
  }, compileAndEval(`
    let counter = 0;
    interface I {
      a;
      [counter++]() { return 0; }
      static [counter++]() { return 1; }
      [counter++]() { return 2; }
    }
    interface K extends (counter++, I) {
      b;
      [counter++]() { return 4; }
      static [counter++]() { return 5; }
      [counter++]() { return 6; }
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
      tc1: typeof C[1],
      tc2: typeof c[2],
      c0: c[0](),
      c1: C[1](),
      c2: c[2](),
      tc4: typeof c[4],
      tc5: typeof C[5],
      tc6: typeof c[6],
      c4: c[4](),
      c5: C[5](),
      c6: c[6](),

      td0: typeof d[0],
      td1: typeof D[1],
      td2: typeof d[2],
      d0: d[0](),
      d1: D[1](),
      d2: d[2](),

      te4: typeof e[4],
      te5: typeof E[5],
      te6: typeof e[6],
      e4: e[4](),
      e5: E[5](),
      e6: e[6](),
    };
  `));
});

test('overriding methods of implemented interfaces', t => {
  t.deepEqual(0, compileAndEval(`
    interface I {
      a;
    }
    interface J extends I {
      b;
      [I.a]() { return 5; }
    }
    class A implements J {
      [J.b](){}
      [I.a]() { return 0; }
    }
    return (new A)[I.a]();
  `));
});

test('diamond pattern dependencies where one side introduces a needed field', t => {
  t.deepEqual({ success: 'function', a: 'function' }, compileAndEval(`
    interface A {
      a;
      success() { return 'success'; }
    }

    interface B0 extends A {
      b0;
    }

    interface B1 extends A {
      b1;
      [A.a]() {}
    }

    interface C extends B0, B1 {
      c;
    }

    class X implements C {
      [B0.b0]() {}
      [B1.b1]() {}
      [C.c]() {}
    }
    return {
      success: typeof X.prototype.success,
      a: typeof X.prototype[A.a],
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
