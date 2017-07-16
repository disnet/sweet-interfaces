'lang sweet.js';
import { class, protocol, implements } from './src/index';

const _const = x => () => x;
const _id = x => x;

interface Functor {
  map;

  void() {
    return this[Functor.map](() => void 0);
  }

  voidRight(x) {
    return this[Functor.map](() => x);
  }
}

Function.prototype[Functor.map] = function(g) {
  return x => this(g(x));
};
Function implements Functor;


interface Apply extends Functor {
  apply;

  applyFirst(b) {
    return _const[Functor.map](this)[Apply.apply](b);
  }

  applySecond(x) {
    return _const(_id)[Functor.map](this)[Apply.apply](b);
  }

  lift2(f) {
    return a => b => f[Functor.map](a)[Apply.apply](b);
  }
}

Function.prototype[Apply.apply] = function (g) {
  return x => this(x)(g(x));
};
Function implements Apply;


interface Applicative extends Apply {
  static pure;

  when(b) {
    return b ? _id : _const(this[Applicative.pure](void 0));
  }
}


class Maybe implements Applicative {
  static [Applicative.pure](x) {
    return new Just(x);
  }
}

class Just extends Maybe {
  constructor(value) {
    super();
    this.value = value;
  }

  [Functor.map](fn) {
    return new Just(fn(this.value));
  }

  [Apply.apply](x) {
    return x[Functor.map](this.value);
  }
}
class Nothing extends Maybe {
  [Functor.map](fn) {
    return this;
  }

  [Apply.apply](x) {
    return this;
  }
}

let j = new Just(1);

console.log(Object.getOwnPropertySymbols());

new Just(1)[Functor.map](console.log);
