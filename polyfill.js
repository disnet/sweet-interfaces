function _foldToObject(memo, [k, v]) {
  memo[k] = v;
  return memo;
}

function _objectMap(obj, fn) {
  return _entries(obj).map(fn).reduce(_foldToObject, {});
}

function _entries(obj) {
  let stringKeys = Object.getOwnPropertyNames(obj);
  let symKeys = Object.getOwnPropertySymbols(obj);
  return [...stringKeys, ...symKeys].map(p => [p, obj[p]]);
}

if (typeof Protocol === 'undefined') {
  let global = Function('return this')();
  global.Protocol = class Protocol {
    constructor({
      name,
      extends: _extends = [],
      symbols = {},
      staticSymbols = {},
      protoProperties = {},
      staticProperties = {},
    } = {}) {
      this._name = name;
      this._extends = _extends;
      this._symbols = _objectMap(symbols, ([name, sym]) => [name, sym == null ? this._createSymbol(name, { value: sym }) : sym]);
      this._staticSymbols = _objectMap(staticSymbols, ([name, sym]) => [name, sym == null ? this._createSymbol(name, { value: sym }) : sym]);
      this._protoProperties = protoProperties;
      this._staticProperties = staticProperties;
      // TODO: check that there's no conflicts between symbols/staticSymbols/protoProperties/staticProperties
      Object.assign(
        this,
        this._symbols,
        this._staticSymbols,
        _objectMap(protoProperties, ([name, desc]) => [name, this._createSymbol(name, desc)]),
        _objectMap(staticProperties, ([name, desc]) => [name, this._createSymbol(name, desc)]),
      );
    }

    static implement(C, ...is) {
      if (typeof C !== 'function' || !C.prototype) {
        throw new TypeError('first parameter must have a [[Construct]] internal slot');
      }
      is.forEach(i => i._mixin(C));
      return C;
    };

    _createSymbol(propName, propDescriptor) {
      if (typeof propName === 'symbol') return propName;
      let interfaceName = this._name == null ? '' : `${this._name}.`;
      //let description = `${interfaceName}${propName}`;
      // HACK: sweet.js bug
      let description = interfaceName + propName;
      if (propDescriptor.get != null && propDescriptor.set == null) {
        //description = `get ${description}`;
        // HACK: sweet.js bug
        description = 'get ' + description;
      } else if (propDescriptor.get == null && propDescriptor.set != null) {
        //description = `set ${description}`;
        // HACK: sweet.js bug
        description = 'set ' + description;
      }
      return Symbol(description);
    }

    _isImplementedBy(klass) {
      return [
        ...Object.values(this._symbols),
        ...Object.keys(this._protoProperties).map(name => this[name]),
      ].every(sym => sym in klass.prototype) &&
      [
        ...Object.values(this._staticSymbols),
        ...Object.keys(this._staticProperties).map(name => this[name]),
      ].every(sym => sym in klass);
    }

    _unimplemented(klass) {
      let protoSymbolsWhichWillBeInherited = this._collect(i => Object.getOwnPropertySymbols(i._protoProperties));
      let staticSymbolsWhichWillBeInherited = this._collect(i => Object.getOwnPropertySymbols(i._staticProperties));
      return this._collect(i => i._unimplementedHelper(klass, protoSymbolsWhichWillBeInherited, staticSymbolsWhichWillBeInherited));
    }

    _unimplementedHelper(klass, protoSymbolsWhichWillBeInherited, staticSymbolsWhichWillBeInherited) {
      let protoSymbolsWhichMustBeImplemented = Object.values(this._symbols);
      let staticSymbolsWhichMustBeImplemented = Object.values(this._staticSymbols);
      let unimplemented = [];
      for (let symbol of protoSymbolsWhichMustBeImplemented) {
        if (!(symbol in klass.prototype) && !protoSymbolsWhichWillBeInherited.includes(symbol)) {
          unimplemented.push(symbol);
        }
      }
      for (let symbol of staticSymbolsWhichMustBeImplemented) {
        if (!(symbol in klass) && !staticSymbolsWhichWillBeInherited.includes(symbol)) {
          unimplemented.push(symbol);
        }
      }
      return unimplemented;
    }

    _collect(fn) {
      return [...fn(this), ...[].concat.apply([], this._extends.map(i => i._collect(fn)))];
    }

    _mixin(klass) {
      let unimplementedSymbols = this._unimplemented(klass);
      if (unimplementedSymbols.length > 0) {
        throw new Error(
          unimplementedSymbols.map(s => s.toString()).join(', ') + ' not implemented by ' + klass
        );
      }

      Object.defineProperties(
        klass.prototype,
        this._collect(i => {
          return _entries(i._protoProperties)
            .filter(function ([name]) { console.log(name); return !(name in klass.prototype); })
            .map(([name, desc]) => [i[name], desc]);
        }).reduceRight(_foldToObject, {})
      );

      Object.defineProperties(
        klass,
        this._collect(i =>
          _entries(i._staticProperties)
            .filter(function ([name]) { console.log(name); return !(name in klass); })
            .map(([name, desc]) => [i[name], desc]))
        .reduceRight(_foldToObject, {})
      );

      return klass;
    }
  };
  // HACK: babel doesn't support `extends null` in class decls/exprs
  Object.setPrototypeOf(Protocol.prototype, null);
}
