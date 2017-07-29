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
