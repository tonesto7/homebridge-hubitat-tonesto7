const helloWorld = require('../helloWorld');

test('helloWorld function should return "Hello, World!"', () => {
  expect(helloWorld()).toBe('Hello, World!');
});