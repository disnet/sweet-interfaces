# sweet interfaces

This is an experimental implementation of [the ECMAScript interfaces proposal](https://github.com/michaelficarra/ecmascript-interfaces-proposal) using [Sweet.js](https://www.sweetjs.org/).

## Install

```sh
npm install @sweet-js/cli sweet-interfaces
```

## Use

Import `class`, `protocol`, and `implements` from the `sweet-interfaces` packages:

```js
// functor.js
'lang sweet.js';
import { class, protocol, implements } from 'sweet-interfaces';

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

Output (hand formatted):

```js
if (typeof Reflect !== 'undefined' && typeof Reflect.implement === 'undefined') {
  Reflect.implement = function(C, ...is) {
    if (typeof C !== 'function' || !C.prototype) {
      throw new TypeError('first parameter must have a [[Construct]] internal slot');
    }
    is.forEach(i => i._mixin(C));
    return C;
  };
}

const Foldable = (function() {
  const _extends = [];
  return Object.create(null, {
    _name: { value: 'Foldable', configurable: false, writable: false, enumerable: false },
    foldr: { get: function() { return this._fields.foldr.value; }, configurable: false, enumerable: true },
    toArray: { get: function() { return this._fields.toArray.value; }, configurable: false, enumerable: true },
    length: { get: function() { return this._fields.length.value; }, configurable: false, enumerable: true },
    contains: { get: function() { return this._fields.contains.value; }, configurable: false, enumerable: true },
    _extends: { value: _extends, configurable: false, writable: false, enumerable: false, },
    _fields: {
      value: {
        foldr: { isStatic: false, name: 'foldr', value: Symbol('Foldable.foldr'), },
        toArray: { isStatic: false, name: 'toArray', value: Symbol('Foldable.toArray'), },
        length: { isStatic: false, name: 'length', value: Symbol('Foldable.length'), },
        contains: { isStatic: false, name: 'contains', value: Symbol('Foldable.contains'), },
      },
      configurable: false, writable: false, enumerable: false,
    },
    _methods: {
      value: [
        {
          isStatic: false,
          name: 'toArray',
          descType: 'value',
          value: function() {
            return this[Foldable.foldr]((m, a) => [a].concat(m), []);
          },
        },
        {
          isStatic: false,
          name: 'length',
          descType: 'get',
          value: function() {
            return this[Foldable.foldr](m => m + 1, 0);
          },
        },
        {
          isStatic: false,
          name: 'contains',
          descType: 'value',
          value: function(eq, e) {
            return this[Foldable.foldr]((m, a) => m || eq(a, e), false);
          },
        },
      ],
      configurable: false, writable: false, enumerable: false,
    },
    _unimplemented: {
      value: function(klass) {
        let fieldsWhichWillBeInherited = this._collect(i => i._methods.map(m => i._fields[m.name].value));
        return this._collect(i => i._unimplementedHelper(klass, fieldsWhichWillBeInherited));
      },
      configurable: false, writable: false, enumerable: false,
    },
    _unimplementedHelper: {
      value: function(klass, fieldsWhichWillBeInherited) {
        let fieldsWhichMustBeImplemented = Object.values(this._fields);
        let unimplemented = [];
        for (let field of fieldsWhichMustBeImplemented) {
          let target = field.isStatic ? klass : klass.prototype;
          if (!(field.value in target) && !fieldsWhichWillBeInherited.includes(field.value)) {
            unimplemented.push(field);
          }
        }
        return unimplemented;
      },
      configurable: false, writable: false, enumerable: false,
    },
    _collect: {
      value: function(fn) {
        return [...fn(this), ...[].concat.apply([], this._extends.map(i => i._collect(fn)))];
      },
      configurable: false, writable: false, enumerable: false,
    },
    _mixin: {
      value: function(klass) {
        let allFields = this._collect(i => [i._fields]).reduceRight((memo, fs) => Object.assign(memo, fs), {});
        let unimplementedFieldNames = this._unimplemented(klass);
        if (unimplementedFieldNames.length > 0) {
          throw new Error(
            unimplementedFieldNames.map(f => f.value.toString()).join(', ') + ' not implemented by ' + klass
          );
        }
        let allMethods = this._collect(i => i._methods);
        allMethods.forEach(({ isStatic: isStatic, name: name, descType: descType, value: value }) => {
          let target = isStatic ? klass : klass.prototype;
          let symbol = allFields[name].value;
          if ({}.hasOwnProperty.call(target, symbol)) return;
          let desc = { configurable: true, enumerable: isStatic };
          desc[descType] = value;
          if (descType === 'value') desc.writable = true;
          Object.defineProperty(target, symbol, desc);
        });
        return klass;
      },
      configurable: false,
      writable: false,
      enumerable: false,
    },
  });
})();

class NEList {
  constructor(head, tail) {
    this.head = head;
    this.tail = tail;
  }
  [Foldable.foldr](f, memo) {
    if (this.tail != null) memo = this.tail[Foldable.foldr](f, memo);
    return f(memo, this.head);
  }
}

Reflect.implement(NEList, Foldable);

let a = new NEList(1, null);
let b = new NEList(0, a);

console.log(b[Foldable.toArray]());
console.log(b[Foldable.length]);
```
