# sweet algebras

This is an experimental implementation of [the ECMAScript interfaces proposal](https://github.com/michaelficarra/ecmascript-interfaces-proposal) using [Sweet.js](https://www.sweetjs.org/).

## Install

```sh
npm install @sweet-js/cli sweet-interfaces
```

## Use

Import `class`, `interface`, and `implements` from the `sweet-algrebras` packages:

```js
// maybe.js
'lang sweet.js';
import { class, interface, implements } from 'sweet-algrebras';

interface Functor {
  map;
}

class Maybe { }
class Just extends Maybe implements Functor {
  constructor(value) {
    super();
    this.value = value;
  }

  [Functor.map](fn) {
    return new Just(fn(this.value));
  }
}
class Nothing extends Maybe implements Functor {
  [Functor.map](fn) {
    return this;
  }
}

new Just(1)[Functor.map](console.log);
```

and compile with Sweet:

```sh
sjs maybe.js
```
