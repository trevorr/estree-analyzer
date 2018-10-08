'use strict';

const chai = require('chai');
const expect = chai.expect;
const acorn = require('acorn');
const format = require('../src/format');

describe('format', function () {
  it('round-trips a mess of syntax', function () {
    const input = `var x = 3 * (1 + 2) + 1 ? 2 : 3;
const add3 = (a, b) => a + b + (1 + 2);
({ f() {
  console.log("hi");
} }).f();
let z = { f() {
  return 5;
} }.f();
let [a, ...b] = [1, ((2, 3), (3, 4)), tag\`(\${x})\`];
({ a } = { a: 42 });
let p = (1, 2);
switch (x) {
  case 1:
    foo;
  case 2: {
    bar;
    break;
  }
  default:
}
var name = 'getter';
({ foo: -bar, baz: null, add, get [name]() {}, x() {} });
function f(a) {
  var q = x + a;
  return q++;
}
class C extends Object {
  constructor() {
    this.y = 2;
  }
  method() {
    return --this.y;
  }
  get [name]() {
    return this.y;
  }
  static x() {
    throw new Error();
  }
  async y() {}
}
f(3);
`;
    const ast = acorn.parse(input);
    let output = '';

    function write(s) {
      output += s;
    }

    format(ast, {
      write
    });
    expect(output).to.equal(input);
  });
});