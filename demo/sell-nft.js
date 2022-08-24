const { WarpNodeFactory } = require('warp-contracts')
const Arweave = require('arweave')
const { readFile } = require('fs/promises')
const { Async } = require('crocks')
const { loadContext, createPair, createSellOrder, readState, mine } = require('./lib')

const { of, fromPromise } = Async
const arweave = Arweave.init({ host: 'arweave.net', port: 443, protocol: 'https' })
const warp = WarpNodeFactory.memCached(arweave)

of({ arweave, warp })
  .chain(loadContext)
  .chain(createPair)
  //.chain(mine)
  .chain(createSellOrder({ qty: 100, price: Number(arweave.ar.arToWinston('0.01')) }))
  //.chain(mine)
  .chain(readState)
  .fork(
    e => console.log(e),
    r => console.log('end')
  )