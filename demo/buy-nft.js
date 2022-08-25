const { WarpNodeFactory } = require('warp-contracts')
const Arweave = require('arweave')
const { readFile } = require('fs/promises')
const { Async } = require('crocks')
const { loadContext, allowOrder, createBuyOrder, readState, mine } = require('./lib')

const { of, fromPromise } = Async
const arweave = Arweave.init({ host: 'arweave.net', port: 443, protocol: 'https' })
const warp = WarpNodeFactory.memCached(arweave)

const sleep = fromPromise(() => new Promise(resolve => setTimeout(resolve, 1000)))

of({ arweave, warp })
  .chain(loadContext)

  .chain(allowOrder({ qty: 1000000 }))
  .chain(x => sleep().map(_ => x)) // sleep 1000
  //.chain(readState)
  .chain(createBuyOrder({ qty: 1000000 }))

  .chain(readState)
  .fork(
    e => console.log(e),
    r => console.log('end')
  )