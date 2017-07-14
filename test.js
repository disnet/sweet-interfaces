'lang sweet.js';
import { class, interface, implements } from './src/index';

interface A {
  a;
  success() { return 'success'; }
}

interface B0 extends A {
  b0;
}

interface B1 extends A {
  b1;
  [A.a]() {}
}

interface C extends B0, B1 {
  c;
}

class X implements C {
  [B0.b0]() {}
  [B1.b1]() {}
  [C.c]() {}
}
