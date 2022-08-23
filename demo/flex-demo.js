const { WarpNodeFactory } = require('warp-contracts')
const Arweave = require('arweave')
const { readFile } = require('fs/promises')
const { Async } = require('crocks')
const { generateWallets, triggerFaucet, deployContracts, mine, createPair, allowOrder, createOrder, readState } = require('./lib')

const { of, fromPromise } = Async
const arweave = Arweave.init({ host: 'localhost', port: '1984', protocol: 'http' })
const warp = WarpNodeFactory.forTesting(arweave)

of({ arweave, warp })
  .chain(generateWallets)
  .chain(triggerFaucet)
  .chain(mine)
  .chain(deployContracts)
  .chain(createPair)
  .chain(allowOrder)
  .chain(createOrder)
  .chain(mine)
  .chain(readState)
  .fork(
    e => console.log(e),
    r => console.log('end')
  )