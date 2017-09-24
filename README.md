# sweet interfaces

This is an experimental implementation of [the ECMAScript first-class protocols proposal](https://github.com/michaelficarra/proposal-first-class-protocols) using [Sweet.js](https://www.sweetjs.org/).

## Install

```sh
npm install @sweet-js/cli sweet-interfaces
```

## Use

Import `class`, `protocol`, and `implements` from the `sweet-interfaces` packages:

```js
'lang sweet.js';
import { class, protocol, implements } from 'sweet-interfaces';
import 'proposal-first-class-protocols';

export protocol Functor {
  map;
}
```

and compile with Sweet:

```sh
sjs functor.js
```

## Sample Output

Input:

```js
'lang sweet.js';
import { class, protocol, implements } from './src/index';

protocol Foldable {
  foldr;

  toArray() {
    return this[Foldable.foldr](
      (m, a) => [a].concat(m),
      []
    );
  }

  get length() {
    return this[Foldable.foldr](m => m + 1, 0);
  }

  contains(eq, e) {
    return this[Foldable.foldr](
      (m, a) => m || eq(a, e),
      false
    );
  }
}

class NEList implements Foldable {
  constructor(head, tail) {
    this.head = head;
    this.tail = tail;
  }

  [Foldable.foldr](f, memo) {
    if (this.tail != null) memo =
      this.tail[Foldable.foldr](f, memo);
    return f(memo, this.head);      
  }
}

let a = new NEList(1, null);
let b = new NEList(0, a);

console.log(b[Foldable.toArray]());
console.log(b[Foldable.length]);
```

Output:

```js
const Foldable_297 = (function(_extends_300, _unused_301) {
  return new Protocol({
    name: "Foldable",
    extends: _extends_300,
    symbols: { foldr: Symbol("Foldable.foldr") },
    staticSymbols: {},
    protoProperties: Object.getOwnPropertyDescriptors({
      toArray() {
        return this[Foldable_297.foldr](
          (m_302, a_303) => [a_303].concat(m_302),
          []
        );
      },
      get length() {
        return this[Foldable_297.foldr](m_304 => m_304 + 1, 0);
      },
      contains(eq_305, e_306) {
        return this[Foldable_297.foldr](
          (m_307, a_308) => m_307 || eq_305(a_308, e_306),
          false
        );
      }
    }),
    staticProperties: Object.getOwnPropertyDescriptors({})
  });
})([], 0);

class NEList {
  constructor(head_309, tail_310) {
    this.head = head_309;
    this.tail = tail_310;
  }
  [Foldable_297.foldr](f_311, memo_312) {
    if (this.tail != null)
      memo_312 = this.tail[Foldable_297.foldr](f_311, memo_312);
    return f_311(memo_312, this.head);
  }
}

Protocol.implement(NEList, Foldable_297);

let a_298 = new NEList(1, null);
let b_299 = new NEList(0, a_298);
console.log(b_299[Foldable_297.toArray]());
console.log(b_299[Foldable_297.length]);
```
