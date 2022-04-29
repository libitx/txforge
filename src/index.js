import nimble from '@runonbitcoin/nimble'

export const foo = 'bar'


const _deps = {
  nimble
}

export const deps = {
  get nimble() {
    if (!_deps.nimble) {
      console.warn('nimble not found. ensure nimble is available to your environment.')
    }

    return _deps.nimble
  },

  set nimble(lib) {
    _deps.nimble = lib
  }
}