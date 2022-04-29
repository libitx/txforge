import test from 'ava'
import { foo } from '../src/index.js'

test('foo is bar', t => {
  t.is(foo, 'bar')
})
