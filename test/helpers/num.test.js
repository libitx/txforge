import test from 'ava'
import { num } from '../../src/helpers/index.js'

test('num() returns integer for small ints', t => {
  t.is(num(0), 0)
  t.is(num(1), 81)
  t.is(num(10), 90)
  t.is(num(16), 96)
})

test('num() returns byte vector for larger ints ints', t => {
  t.deepEqual(num(17), [17])
  t.deepEqual(num(3200), [128, 12])
})
