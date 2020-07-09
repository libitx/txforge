import { assert } from 'chai'
import bsv from 'bsv'
import Forge from '../../src/forge'
import Cast from '../../src/cast'
import { P2MS } from '../../src/casts'

const keyPairs = [bsv.KeyPair.fromRandom(), bsv.KeyPair.fromRandom(), bsv.KeyPair.fromRandom()],
      pubKeys = keyPairs.map(k => k.pubKey)


describe('P2MS.lockingScript', () => {
  let cast;
  beforeEach(() => {
    cast = Cast.lockingScript(P2MS, { satoshis: 5000, threshold: 2, pubKeys })
  })

  it('script template is correct length', () => {
    assert.lengthOf(cast.script, 4)
  })

  it('getSize() returns correct txOut size', () => {
    assert.equal(cast.getSize(), 113)
  })

  it('getScript() returns P2MS locking script', () => {
    const script = cast.getScript(cast.params)
    assert.lengthOf(script.chunks, 6)
    assert.equal(script.chunks[0].opCodeNum, bsv.OpCode.OP_2)
    assert.deepEqual(script.chunks[1].buf, keyPairs[0].pubKey.toBuffer())
    assert.deepEqual(script.chunks[2].buf, keyPairs[1].pubKey.toBuffer())
    assert.deepEqual(script.chunks[3].buf, keyPairs[2].pubKey.toBuffer())
    assert.equal(script.chunks[4].opCodeNum, bsv.OpCode.OP_3)
  })

  it('getScript() throws error if no threshold', () => {
    cast = Cast.lockingScript(P2MS, { satoshis: 5000, pubKeys })
    assert.throws(_ => cast.getScript(cast.params), 'P2MS lockingScript requires threshold')
  })

  it('getScript() throws error if no pubKeys', () => {
    cast = Cast.lockingScript(P2MS, { satoshis: 5000, threshold: 2 })
    assert.throws(_ => cast.getScript(cast.params), 'P2MS lockingScript requires pubKeys')
  })
})


describe('P2MS.unlockingScript', () => {
  let cast, forge;
  beforeEach(() => {
    cast = Cast.unlockingScript(P2MS, {
      txid: '5e3014372338f079f005eedc85359e4d96b8440e7dbeb8c35c4182e0c19a1a12',
      vout: 0,
      satoshis: 2000,
      script: '5221'+ keyPairs[0].pubKey.toHex() +'21'+ keyPairs[1].pubKey.toHex() +'21'+ keyPairs[2].pubKey.toHex() +'53ae'
    })
    forge = new Forge({ inputs: [cast] })
    forge.build()
  })

  it('script template is correct length', () => {
    assert.lengthOf(cast.script, 2)
  })

  it('getSize() returns correct txOut size', () => {
    assert.equal(cast.getSize(), 188)
  })

  it('getScript() returns P2MS unlocking script', () => {
    const script = cast.getScript(forge, { keyPairs })
    assert.lengthOf(script.chunks, 4)
    assert.isTrue(bsv.Sig.IsTxDer(script.chunks[1].buf))
    assert.isTrue(bsv.Sig.IsTxDer(script.chunks[2].buf))
    assert.isTrue(bsv.Sig.IsTxDer(script.chunks[3].buf))
  })

  it('getScript() throws error when incorrect keyPair', () => {
    const keyPairs = [bsv.KeyPair.fromRandom()]
    assert.throws(_ => cast.getScript(forge, { keyPairs }), 'P2MS unlockingScript keyPairs must match lockingScript pubKeys')
  })
})
