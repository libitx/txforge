import test from 'ava'
import { getOpt } from '../../src/classes/shared.js'

test('getOpt() gets the first found value from the list of keys', t => {
  const params = { foo: 1, bar: 0 }
  t.is(getOpt(params, ['foo', 'bar']), 1)
  t.is(getOpt(params, ['barx', 'bar', 'foo']), 0)
})

test('getOpt() returns undefined if no value found from keys', t => {
  const params = { foo: 1, bar: 0 }
  t.is(getOpt(params, ['foo1', 'foo2', 'foo3']), undefined)
})

test('getOpt() returns default if no value found from keys', t => {
  const params = { foo: 1, bar: 0 }
  t.is(getOpt(params, ['foo1', 'foo2', 'foo3'], 999), 999)
})
