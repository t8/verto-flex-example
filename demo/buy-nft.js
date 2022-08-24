const { WarpNodeFactory } = require('warp-contracts')
const Arweave = require('arweave')
const { readFile } = require('fs/promises')
const { Async } = require('crocks')
const { loadContext, allowOrder, createBuyOrder, readState, mine } = require('./lib')

const { of, fromPromise } = Async
const arweave = Arweave.init({ host: 'arweave.net', port: 443, protocol: 'https' })
const warp = WarpNodeFactory.memCached(arweave)

of({ arweave, warp })
  .chain(loadContext)

  .chain(allowOrder({ qty: Number(arweave.ar.arToWinston('0.01')) }))
  .chain(createBuyOrder({ qty: Number(arweave.ar.arToWinston('0.01')) }))

  .chain(readState)
  .fork(
    e => console.log(e),
    r => console.log('end')
  )