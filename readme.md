# sweet algebras

This is an experimental implementation of [emcascript algebras](https://github.com/michaelficarra/ecmascript-algebras) in Sweet.js.

## Install

```sh
npm install @sweet-js/cli sweet-algrebras
```

## Use

Import `class` and `interface` from the `sweet-algrebras` packages:

```js
// maybe.js
'lang sweet.js';
import { class, interface } from 'sweet-algrebras';

interface Functor {
  map;
}

class Maybe implements Functor { }
class Just extends Maybe {
  constructor(value) {
    super();
    this.value = value;
  }

  [Functor.map](fn) {
    return new Just(fn(this.value));
  }
}
class Nothing extends Maybe {
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
