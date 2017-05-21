import { class, interface } from '../src/index';

interface Functor {
  // map :: Functor f => f a ~> (a -> b) -> f b
  map;
}

interface Apply extends Functor {
  // ap :: Apply f => f a ~> f (a -> b) -> f b
  ap;
}

interface Applicative extends Apply {
  // of :: Applicative f => a -> f a
  static of;
}

interface Chain extends Apply {
  // chain :: Chain m => m a ~> (a -> m b) -> m b
  chain;
}

interface Monad extends Applicative extends Chain {}

class Maybe implements Monad {
  static [Applicative.of](v) {
    return new Just(v);
  }
}

class Just extends Maybe {
  constructor(v) {
    super();
    this.value = v;
  }

  [Functor.map](fn) {
    return new Just(fn(this.value));
  }

  [Apply.ap](fn) {
    return fn instanceof Just
      ? this[Functor.map](fn.value)
      : fn;
  }

  [Chain.chain](fn) {
    return fn(this.value);
  }
}


class Nothing extends Maybe {

  [Functor.map](fn) {
    return this;
  }

  [Apply.ap](fn) {
    return this;
  }

  [Chain.chain](fn) {
    return this;
  }
}

Maybe[Applicative.of](42)[Functor.map](console.log);
