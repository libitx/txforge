import { assert } from 'chai'
import bsv from 'bsv'
import Forge from '../src/forge'
import { p2pkh } from '../src/casts'


describe('new Forge()', () => {

})


describe('Forge#changeAddress', () => {
  let forge1, forge2;
  beforeEach(() => {
    forge1 = new Forge()
    forge2 = new Forge({ changeAddress: '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq' })
  })

  it('is undefined when no changeScript', () => {
    assert.isUndefined(forge1.changeScript)
    assert.isUndefined(forge1.changeAddress)
  })

  it('returns address when changeScript exists', () => {
    assert.instanceOf(forge2.changeScript, bsv.Script)
    assert.equal(forge2.changeAddress, '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq')
  })

  it('can be changed with getters and setters', () => {
    forge1.changeAddress = '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq'
    assert.instanceOf(forge1.changeScript, bsv.Script)
    assert.equal(forge1.changeAddress, '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq')
  })
})


describe('Forge#addInput()', () => {
  let forge;
  beforeEach(() => {
    forge = new Forge()
  })

  it('adds a valid cast instance to the tx', () => {
    const input = Forge.cast(p2pkh, {
      txid: '5e3014372338f079f005eedc85359e4d96b8440e7dbeb8c35c4182e0c19a1a12',
      vout: 0,
      satoshis: 2000,
      script: '76a91410bdcba3041b5e5517a58f2e405293c14a7c70c188ac'
    })
    forge.addInput(input)
    assert.lengthOf(forge.inputs, 1)
  })

  it('adds paramaters as a p2pkh cast', () => {
    forge.addInput({
      txid: '5e3014372338f079f005eedc85359e4d96b8440e7dbeb8c35c4182e0c19a1a12',
      vout: 0,
      satoshis: 2000,
      script: '76a91410bdcba3041b5e5517a58f2e405293c14a7c70c188ac'
    })
    assert.lengthOf(forge.inputs, 1)
  })

  it('throws error with invalid params', () => {
    assert.throws(_ => forge.addInput({}), 'Input must be an instance of Cast')
  })
})


describe('Forge#addOutput()', () => {
  let forge;
  beforeEach(() => {
    forge = new Forge()
  })

  it('adds output script params to the tx', () => {
    forge.addOutput({
      script: '76a91410bdcba3041b5e5517a58f2e405293c14a7c70c188ac',
      satoshis: 15399
    })
    assert.lengthOf(forge.outputs, 1)
  })

  it('adds output data params to the tx', () => {
    forge.addOutput({
      data: ['0xeeefef', 'foo', 'bar']
    })
    assert.lengthOf(forge.outputs, 1)
  })

  it('adds output p2pkh params to the tx', () => {
    forge.addOutput({
      to: '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq',
      satoshis: 50000
    })
    assert.lengthOf(forge.outputs, 1)
  })

  it('throws error with invalid params', () => {
    assert.throws(_ => forge.addOutput({}), 'Invalid TxOut params')
  })
})


describe('Forge#inputSum()', () => {
  let forge;
  beforeEach(() => {
    forge = new Forge()
  })

  it('returns 0 when no inputs', () => {
    assert.equal(forge.inputSum(), 0)
  })

  it('returns sum of all inputs', () => {
    forge.addInput({
      txid: '5e3014372338f079f005eedc85359e4d96b8440e7dbeb8c35c4182e0c19a1a12',
      vout: 0,
      satoshis: 2000,
      script: '76a91410bdcba3041b5e5517a58f2e405293c14a7c70c188ac'
    })
    forge.addInput({
      txid: '5e3014372338f079f005eedc85359e4d96b8440e7dbeb8c35c4182e0c19a1a12',
      vout: 1,
      satoshis: 555,
      script: '76a91410bdcba3041b5e5517a58f2e405293c14a7c70c188ac'
    })
    assert.equal(forge.inputSum(), 2555)
  })
})


describe('Forge#outputSum()', () => {
  let forge;
  beforeEach(() => {
    forge = new Forge()
  })

  it('returns 0 when no outputs', () => {
    assert.equal(forge.outputSum(), 0)
  })

  it('returns sum of all outputs', () => {
    forge.addOutput({ to: '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq', satoshis: 50000 })
    forge.addOutput({ to: '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq', satoshis: 5000 })
    forge.addOutput({ data: ['foo', 'bar', 'baz'] })
    assert.equal(forge.outputSum(), 55000)
  })
})


describe('Forge#build()', () => {
  let keyPair, forge;
  beforeEach(() => {
    keyPair = bsv.KeyPair.fromRandom()
    forge = new Forge()
  })

  it('builds the inputs into the tx', () => {
    forge.addInput({
      txid: '5e3014372338f079f005eedc85359e4d96b8440e7dbeb8c35c4182e0c19a1a12',
      vout: 0,
      satoshis: 2000,
      script: '76a91410bdcba3041b5e5517a58f2e405293c14a7c70c188ac'
    })
    assert.equal(forge.tx.toHex(), '01000000000000000000')
    forge.build()
    assert.equal(forge.tx.toBuffer().length, 159)
  })

  it('builds the outputs into the tx', () => {
    forge.addOutput([
      { to: '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq', satoshis: 50000 },
      { data: ['0x1234567890'] }
    ])
    assert.equal(forge.tx.toHex(), '01000000000000000000')
    forge.build()
    assert.match(forge.tx.toHex(), /76a914[a-f0-9]{40}88ac/)
    assert.match(forge.tx.toHex(), /006a051234567890/)
  })

  it('builds and signs inputs when build params given', () => {
    const pubKeyHash = bsv.Address.fromPubKey(keyPair.pubKey).hashBuf.toString('hex')
    forge
      .addInput({
        txid: '5e3014372338f079f005eedc85359e4d96b8440e7dbeb8c35c4182e0c19a1a12',
        vout: 0,
        satoshis: 5000,
        script: '76a914'+ pubKeyHash +'88ac'
      })
      .addOutput({
        to: '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq',
        satoshis: 5000
      })
    forge.build()
    assert.match(forge.tx.toHex(), /(00){73}.*(00){33}/)
    forge.build({keyPair})
    assert.notMatch(forge.tx.toHex(), /(00){73}.*(00){33}/)
  })
})


describe('Forge#estimateFee()', () => {
  let forge;
  beforeEach(() => {
    forge = new Forge()
  })

  it('assumes 1 p2pkh input, event when empty', () => {
    assert.equal(forge.estimateFee(), 79)
  })

  it('uses specified rates if provided', () => {
    forge.addOutput({ to: '1DBz6V6CmvjZTvfjvWpvvwuM1X7GkRmWEq', satoshis: 50000 })
    forge.addOutput({ data: ['foo', 'bar', 'baz'] })
    assert.equal(forge.estimateFee(), 108)
    assert.equal(forge.estimateFee({ standard: 0.50, data: 0.25 }), 102)
    assert.equal(forge.estimateFee({ standard: 0.25, data: 0.25 }), 54)
  })
})
