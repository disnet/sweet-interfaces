'lang sweet.js';
import { class, interface } from './src/index';

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

let j = new Just(1);

console.log(Object.getOwnPropertySymbols());

new Just(1)[Functor.map](console.log);
