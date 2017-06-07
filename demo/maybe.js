import { class, interface, implements } from '../src/index';

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
  [Functor.map](f) { return this[Apply.ap](this.constructor[Applicative.of](f)); }
}

interface Chain extends Apply {
  // chain :: Chain m => m a ~> (a -> m b) -> m b
  chain;
  [Apply.ap](m) { return m[Chain.chain](f => this[Functor.map](f)); }
}

interface Monad extends Applicative, Chain {
  [Functor.map](f) { return this[Chain.chain](a => this.constructor[Applicative.of](f(a))); }
}

class Maybe {
  static [Applicative.of](v) {
    return new Just(v);
  }
}

class Just extends Maybe implements Monad {
  constructor(v) {
    super();
    this.value = v;
  }

  [Chain.chain](fn) {
    return fn(this.value);
  }
}


class Nothing extends Maybe implements Monad {
  [Chain.chain](fn) {
    return this;
  }
}

Maybe[Applicative.of](42)[Functor.map](console.log);
(new Nothing)[Apply.ap](Maybe[Applicative.of](_ => console.log('Nothing to see here!')));
