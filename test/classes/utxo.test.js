import test from 'ava'
import nimble from '@runonbitcoin/nimble'
import { toUTXO, getUTXO, forgeTx, casts} from '../../src/index.js'

const { Transaction, Script } = nimble.classes

test('toUTXO() accepts Mattercloud api params', t => {
  const params = {
    "address": "12XXBHkRNrBEb7GCvAP4G8oUs5SoDREkVX",
    "txid": "5e3014372338f079f005eedc85359e4d96b8440e7dbeb8c35c4182e0c19a1a12",
    "vout": 0,
    "amount": 0.00015399,
    "satoshis": 15399,
    "value": 15399,
    "height": 576168,
    "confirmations": 34993,
    "scriptPubKey": "76a91410bdcba3041b5e5517a58f2e405293c14a7c70c188ac",
    "script": "76a91410bdcba3041b5e5517a58f2e405293c14a7c70c188ac",
    "outputIndex": 0
  }

  const utxo = toUTXO(params)
  t.is(utxo.txid, params.txid)
  t.is(utxo.vout, params.vout)
  t.is(utxo.satoshis, params.satoshis)
  t.true(utxo.script instanceof Script)
  t.true(utxo.output instanceof Transaction.Output)
})

test('toUTXO() accepts WOC api params', t => {
  const params = {
    "height": 578325,
    "tx_pos": 0,
    "tx_hash": "62824e3af3d01113e9bce8b73576b833990d231357bd718385958c21d50bbddd",
    "value": 1250020815
  }

  const utxo = toUTXO(params)
  t.is(utxo.txid, params.tx_hash)
  t.is(utxo.vout, params.tx_pos)
  t.is(utxo.satoshis, params.value)
})

test('getUTXO() gets UTXO from the given tx and vout', t => {
  const tx = forgeTx({
    outputs: [casts.Raw.lock(1000, { script: new Script() })]
  })

  const utxo = getUTXO(tx, 0)
  t.is(utxo.txid, tx.hash)
  t.is(utxo.vout, 0)
  t.is(utxo.satoshis, 1000)
  t.true(utxo.script instanceof Script)
  t.true(utxo.output instanceof Transaction.Output)
})
