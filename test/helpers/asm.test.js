import test from 'ava'
import { asm } from '../../src/helpers/index.js'

const str = 'OP_DUP OP_HASH160 5ae866af9de106847de6111e5f1faa168b2be689 OP_EQUALVERIFY OP_CHECKSIG'

test('asm() converts asm string to script chunks', t => {
  const chunks = asm(str)
  t.is(chunks.length, 5)
  t.is(chunks[0].opcode, 118)
  t.is(chunks[1].opcode, 169)
  t.is(chunks[3].opcode, 136)
  t.is(chunks[4].opcode, 172)
})

test('asm() throws with invalid asm string', t => {
  t.throws(_ => asm('OP_RETURN xyz OP_0'))
})
