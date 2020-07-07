/**
 * TODO
 */
const multisig = {
  /**
   * TODO
   */
  lockingScript: {
    template: [
      { name: 'thresholdOp', size: 1 },
      { name: 'pubKeys', size: ({ pubKeys }) => pubKeys.length * 33 },
      { name: 'pubKeysOp', size: 1 },
      OpCode.OP_CHECKMULTISIG
    ],

    script() {

    }
  },

  /**
   * TODO
   */
  unlockingScript: {
    template: [
      OpCode.OP_1,
      { name: 'sigs', size: ({ keyPairs }) => keyPairs.length * 73 }
    ]
  }
}