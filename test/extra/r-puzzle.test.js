import test from 'ava'
import { generateK, calculateR } from '../../src/extra/r-puzzle.js'

test('generateK() returns random K value', t => {
  const k = generateK()
  t.true(k instanceof Uint8Array)
  t.is(k.length, 32)
})

test('calculateR() returns R from K', t => {
  const k = generateK()
  const r = calculateR(k)
  t.true(r instanceof Uint8Array)
  t.true([32,33].includes(r.length))
})
