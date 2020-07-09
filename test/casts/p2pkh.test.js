import { assert } from 'chai'
import bsv from 'bsv'
import Forge from '../../src/forge'
import Cast from '../../src/cast'
import { P2PKH } from '../../src/casts'

const keyPair = bsv.KeyPair.fromRandom(),
      address = bsv.Address.fromPubKey(keyPair.pubKey)


describe('P2PKH.lockingScript', () => {
  let cast;
  beforeEach(() => {
    cast = Cast.lockingScript(P2PKH, { satoshis: 5000, address })
  })

  it('script template is correct length', () => {
    assert.lengthOf(cast.script, 5)
  })

  it('getSize() returns correct txOut size', () => {
    assert.equal(cast.getSize(), 34)
  })

  it('getScript() returns P2PKH locking script', () => {
    const script = cast.getScript(cast.params)
    assert.lengthOf(script.chunks, 5)
    assert.deepEqual(script.chunks[2].buf, address.hashBuf)
  })

  it('getScript() throws error if no address', () => {
    cast = Cast.lockingScript(P2PKH, { satoshis: 5000 })
    assert.throws(_ => cast.getScript(cast.params), 'P2PKH lockingScript requires address')
  })
})


describe('P2PKH.unlockingScript', () => {
  let cast, forge;
  beforeEach(() => {
    cast = Cast.unlockingScript(P2PKH, {
      txid: '5e3014372338f079f005eedc85359e4d96b8440e7dbeb8c35c4182e0c19a1a12',
      vout: 0,
      satoshis: 2000,
      script: '76a914'+ address.hashBuf.toString('hex') +'88ac'
    })
    forge = new Forge({ inputs: [cast] })
    forge.build()
  })

  it('script template is correct length', () => {
    assert.lengthOf(cast.script, 2)
  })

  it('getSize() returns correct txOut size', () => {
    assert.equal(cast.getSize(), 148)
  })

  it('getScript() returns P2PKH unlocking script', () => {
    const script = cast.getScript(forge, { keyPair })
    assert.lengthOf(script.chunks, 2)
    assert.deepEqual(script.chunks[1].buf, keyPair.pubKey.toBuffer())
  })

  it('getScript() throws error when incorrect keyPair', () => {
    const keyPair = bsv.KeyPair.fromRandom()
    assert.throws(_ => cast.getScript(forge, { keyPair }), 'P2PKH unlockingScript requires valid keyPair')
  })
})
