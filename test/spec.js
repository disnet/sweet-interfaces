import test from 'ava';
import { compileAndEval, compileTopLevel, compile } from './_compile';

test('an interface is an object', t => {
  t.is(compileAndEval(`
    protocol I {}
    return typeof I;
  `), 'object');
});

test('an interface has no prototype', t => {
  t.is(compileAndEval(`
    protocol I {}
    return Object.getPrototypeOf(I);
  `), null);
});

test('an interface can declare a symbol', t => {
  t.is(compileAndEval(`
    protocol I {
      a;
    }
    return typeof I.a;
  `), 'symbol');
});

test('an interface can declare a static symbol', t => {
  t.is(compileAndEval(`
    protocol I {
      static a;
    }
    return typeof I.a;
  `), 'symbol');
});

test('an interface can declare multiple symbols', t => {
  t.deepEqual(compileAndEval(`
    protocol I {
      a; b;
      static c;
    }
    return {
      a: typeof I.a,
      b: typeof I.b,
      c: typeof I.c,
    };
  `), { a: 'symbol', b: 'symbol', c: 'symbol' });
});

test('an interface can be exported', t => {
  t.regex(compileTopLevel(`
    export protocol INTERFACENAME { a; }
  `), /\bINTERFACENAME\b/);
});


test('a class can implement an interface', t => {
  t.is(compileAndEval(`
    protocol I {
      a;
      b(){}
    }
    class C implements I {
      [I.a](){}
    }
    return typeof C.prototype[I.b];
  `), 'function');
});

test('a class can implement an interface with a static member', t => {
  t.deepEqual(compileAndEval(`
    protocol I {
      a;
      static b;
      c(){}
    }
    class C implements I {
      [I.a](){}
      static [I.b](){}
    }
    return typeof C.prototype[I.c];
  `), 'function');
});

test('a class can get a static member from an interface', t => {
  t.deepEqual(compileAndEval(`
    protocol I {
      a;
      static b(){}
    }
    class C implements I {
      [I.a](){}
    }
    return typeof C[I.b];
  `), 'function');
});

test('a class can implement an interface with a getter/setter', t => {
  t.deepEqual(compileAndEval(`
    protocol I {
      a;
      get b() {}
      set c(d) {}
    }
    class C implements I {
      [I.a](){}
    }
    return {
      b: typeof Object.getOwnPropertyDescriptor(C.prototype, I.b).get,
      c: typeof Object.getOwnPropertyDescriptor(C.prototype, I.c).set,
    };
  `), {
    b: 'function',
    c: 'function',
  });
});

test('a class can implement an interface with a static getter/setter', t => {
  t.deepEqual(compileAndEval(`
    protocol I {
      a;
      static get b() {}
      static set c(d) {}
    }
    class C implements I {
      [I.a](){}
    }
    return {
      b: typeof Object.getOwnPropertyDescriptor(C, I.b).get,
      c: typeof Object.getOwnPropertyDescriptor(C, I.c).set,
    };
  `), {
    b: 'function',
    c: 'function',
  });
});

test('a class can implement multiple interfaces', t => {
  t.deepEqual(compileAndEval(`
    protocol I {
      a;
      b(){}
    }
    protocol J {
      b;
      c(){}
    }
    class C implements I, J {
      [I.a](){}
      [J.b](){}
    }
    return {
      b: typeof C.prototype[I.b],
      c: typeof C.prototype[J.c],
    };
  `), { b: 'function', c: 'function' });
});

test('a class can extend another and implement an interface', t => {
  t.deepEqual(compileAndEval(`
    protocol I {
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
      b: typeof b[I.b],
      c: typeof b.c,
      d: typeof b.d,
      bA: b instanceof A,
      bB: b instanceof B,
    };
  `), { b: 'function', c: 'function', d: 'function', bA: true, bB: true });
});


test('an unimplemented interface throws', t => {
  let code = compile(`
    protocol I { a; }
    class C implements I {}
  `);
  t.throws(() => { eval(code); });
});

test('an unimplemented static interface throws', t => {
  let code = compile(`
    protocol I { static a; }
    class C implements I {}
  `);
  t.throws(() => { eval(code); });
});

test('duplicate interface fields is early error', t => {
  t.throws(() => {
    compile(`protocol I { a; b; a; }`);
  });
});

test('duplicate static interface fields is early error', t => {
  t.throws(() => {
    compile(`protocol I { static a; static b; static a; }`);
  });
});

test('same name static and prototype fields is early error', t => {
  t.throws(() => {
    compile(`protocol I { a; static a; }`);
  });
  t.throws(() => {
    compile(`protocol I { static a; a; }`);
  });
});

test('static method named prototype is early error', t => {
  t.notThrows(() => {
    compile(`protocol I { prototype; }`);
  });
  t.notThrows(() => {
    compile(`protocol I { static prototype; }`);
  });
  t.notThrows(() => {
    compile(`protocol I { prototype(){} }`);
  });
  t.throws(() => {
    compile(`protocol I { static prototype(){} }`);
  });
});

test('proto method named constructor is early error', t => {
  t.notThrows(() => {
    compile(`protocol I { constructor; }`);
  });
  t.notThrows(() => {
    compile(`protocol I { static constructor; }`);
  });
  t.throws(() => {
    compile(`protocol I { constructor(){} }`);
  });
  t.notThrows(() => {
    compile(`protocol I { static constructor(){} }`);
  });
});


test('interfaces can extend other interfaces', t => {
  t.deepEqual(compileAndEval(`
    protocol I {
      a;
      c(){}
    }
    protocol J {
      b;
      d(){}
    }
    protocol K extends I, J {}
    class C implements K {
      [I.a](){}
      [J.b](){}
    }
    return {
      c: typeof C.prototype[I.c],
      d: typeof C.prototype[J.d],
    };
  `), { c: 'function', d: 'function' });
});

test('minimal implementations', t => {
  t.deepEqual(compileAndEval(`
    protocol Functor { map; }
    protocol Applicative extends Functor { pure; apply; }
    protocol Monad extends Applicative { bind; join; kleisli() {} }
    protocol MonadViaBind extends Monad {
      [Monad.join]() {}
    }
    protocol MonadViaJoin extends Monad {
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
      c: typeof C.prototype[Monad.kleisli],
      d: typeof D.prototype[Monad.kleisli],
    };
  `), { c: 'function', d: 'function' });
});

test('evaluation order is preserved', t => {
  t.deepEqual(compileAndEval(`
    let counter = 0;
    protocol I {
      a;
      [counter++]() { return 0; }
      static [counter++]() { return 1; }
      [counter++]() { return 2; }
    }
    protocol K extends (counter++, I) {
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
      tc0: typeof c[I[0]],
      tc1: typeof C[I[1]],
      tc2: typeof c[I[2]],
      c0: c[I[0]](),
      c1: C[I[1]](),
      c2: c[I[2]](),
      tc4: typeof c[K[4]],
      tc5: typeof C[K[5]],
      tc6: typeof c[K[6]],
      c4: c[K[4]](),
      c5: C[K[5]](),
      c6: c[K[6]](),

      td0: typeof d[I[0]],
      td1: typeof D[I[1]],
      td2: typeof d[I[2]],
      d0: d[I[0]](),
      d1: D[I[1]](),
      d2: d[I[2]](),

      te4: typeof e[K[4]],
      te5: typeof E[K[5]],
      te6: typeof e[K[6]],
      e4: e[K[4]](),
      e5: E[K[5]](),
      e6: e[K[6]](),
    };
  `), {
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
  });
});

test('overriding methods of implemented interfaces', t => {
  t.is(compileAndEval(`
    protocol I {
      a;
    }
    protocol J extends I {
      b;
      [I.a]() { return 5; }
    }
    class A implements J {
      [J.b](){}
      [I.a]() { return 0; }
    }
    return (new A)[I.a]();
  `), 0);
});

test('diamond pattern dependencies where one side introduces a needed field', t => {
  t.deepEqual(compileAndEval(`
    protocol A {
      a;
      success() { return 'success'; }
    }

    protocol B0 extends A {
      b0;
    }

    protocol B1 extends A {
      b1;
      [A.a]() {}
    }

    protocol C extends B0, B1 {
      c;
    }

    class X implements C {
      [B0.b0]() {}
      [B1.b1]() {}
      [C.c]() {}
    }
    return {
      success: typeof X.prototype[A.success],
      a: typeof X.prototype[A.a],
    };
  `), { success: 'function', a: 'function' });
});

test('implements operator', t => {
  t.deepEqual(compileAndEval(`
    protocol I {
      a;
      b() {}
    }
    protocol K {
      a;
      b() {}
    }
    class C {
      [I.a]() {}
    }
    class D implements I {
      [I.a]() {}
    }
    class E {
      [I.a]() {}
      [I.b]() {}
    }
    return {
      ci: C implements I,
      ck: C implements K,
      di: D implements I,
      dk: D implements K,
      ei: E implements I,
      ek: E implements K,
    };
  `), { ci: false, ck: false, di: true, dk: false, ei: true, ek: false });
});

test('implement is a method on Reflect', t => {
  t.is(compileAndEval(`
    protocol I {
      a;
      f() { return this[I.a](); }
    }
    class C {
      constructor() { this.x = 0; }
      [I.a]() { return 'success'; }
    }
    Reflect.implement(C, I);
    let c = new C;
    return c[I.f]();
  `), 'success');
});

test('Reflect.implement throws TypeError when first argument is not a constructor', t => {
  let _null = compile(`
    protocol I { }
    Reflect.implement(null, I);
  `);
  t.throws(() => { eval(_null); });
  let object = compile(`
    protocol I { }
    Reflect.implement({}, I);
  `);
  t.throws(() => { eval(object); });
  let missing = compile(`
    protocol I { }
    Reflect.implement();
  `);
  t.throws(() => { eval(missing); });
});

test('Reflect.implement mutates and returns first parameter', t => {
  t.deepEqual(compileAndEval(`
    protocol I {
      a;
      f() {}
    }
    protocol K {
      b;
      g() {}
    }
    class C {
      [I.a]() {}
      [K.b]() {}
    }
    Reflect.implement(Reflect.implement(C, I), K);
    let c = new C;
    return {
      a: typeof c[I.a],
      b: typeof c[K.b],
      f: typeof c[I.f],
      g: typeof c[K.g],
    };
  `), { a: 'function', b: 'function', f: 'function', g: 'function' });
});

test('Reflect.implement accepts 1 or more interfaces', t => {
  t.deepEqual(compileAndEval(`
    protocol I {
      a;
      f() {}
    }
    protocol K {
      b;
      g() {}
    }
    class C {
      [I.a]() {}
      [K.b]() {}
    }
    Reflect.implement(C, I, K);
    let c = new C;
    return {
      a: typeof c[I.a],
      b: typeof c[K.b],
      f: typeof c[I.f],
      g: typeof c[K.g],
    };
  `), { a: 'function', b: 'function', f: 'function', g: 'function' });
});
