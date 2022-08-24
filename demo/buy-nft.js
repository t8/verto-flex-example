const { WarpNodeFactory } = require('warp-contracts')
const Arweave = require('arweave')
const { readFile } = require('fs/promises')
const { Async } = require('crocks')
const { loadContext, allowOrder, createBuyOrder, readState } = require('./lib')

const { of, fromPromise } = Async
const arweave = Arweave.init({ host: 'localhost', port: '1984', protocol: 'http' })
const warp = WarpNodeFactory.forTesting(arweave)

of({ arweave, warp })
  .chain(loadContext)

  .chain(allowOrder({ qty: 1 }))
  .chain(createBuyOrder({ qty: 100, price: 1 }))
  .chain(mine)
  .chain(readState)
  .fork(
    e => console.log(e),
    r => console.log('end')
  )