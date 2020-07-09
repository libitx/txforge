import { assert } from 'chai'
import bsv from 'bsv'
import Forge from '../../src/forge'
import Cast from '../../src/cast'
import { P2PK } from '../../src/casts'

const keyPair = bsv.KeyPair.fromRandom(),
      pubKey = keyPair.pubKey


describe('P2PK.lockingScript', () => {
  let cast;
  beforeEach(() => {
    cast = Cast.lockingScript(P2PK, { satoshis: 5000, pubKey })
  })

  it('script template is correct length', () => {
    assert.lengthOf(cast.script, 2)
  })

  it('getSize() returns correct txOut size', () => {
    assert.equal(cast.getSize(), 44)
  })

  it('getScript() returns P2PK locking script', () => {
    const script = cast.getScript(cast.params)
    assert.lengthOf(script.chunks, 2)
    assert.deepEqual(script.chunks[0].buf, pubKey.toBuffer())
  })

  it('getScript() throws error if no pubKey', () => {
    cast = Cast.lockingScript(P2PK, { satoshis: 5000 })
    assert.throws(_ => cast.getScript(cast.params), 'P2PK lockingScript requires pubKey')
  })
})


describe('P2PK.unlockingScript', () => {
  let cast, forge;
  beforeEach(() => {
    cast = Cast.unlockingScript(P2PK, {
      txid: '5e3014372338f079f005eedc85359e4d96b8440e7dbeb8c35c4182e0c19a1a12',
      vout: 0,
      satoshis: 2000,
      script: '21'+ pubKey.toString('hex') +'ac'
    })
    forge = new Forge({ inputs: [cast] })
    forge.build()
  })

  it('script template is correct length', () => {
    assert.lengthOf(cast.script, 1)
  })

  it('getSize() returns correct txOut size', () => {
    assert.equal(cast.getSize(), 114)
  })

  it('getScript() returns P2PK unlocking script', () => {
    const script = cast.getScript(forge, { keyPair })
    assert.lengthOf(script.chunks, 1)
    assert.isTrue(bsv.Sig.IsTxDer(script.chunks[0].buf))
  })

  it('getScript() throws error when incorrect keyPair', () => {
    const keyPair = bsv.KeyPair.fromRandom()
    assert.throws(_ => cast.getScript(forge, { keyPair }), 'P2PK unlockingScript requires valid keyPair')
  })
})
