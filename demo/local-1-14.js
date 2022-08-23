const { WarpNodeFactory } = require('warp-contracts')
const Arweave = require('arweave')
const { readFile } = require('fs/promises')
const { Async } = require('crocks')

const { of, fromPromise } = Async
const arweave = Arweave.init({ host: 'localhost', port: '1984', protocol: 'http' })
const warp = WarpNodeFactory.forTesting(arweave)


const ctx = { warp, arweave }

// set NFT for Sale!
of(ctx)
  .chain(fromPromise(generateWallets))
  .chain(fromPromise(triggerFaucet))
  .chain(fromPromise(mine))
  .chain(fromPromise(deployContracts))
  .chain(fromPromise(mine))
  .chain(fromPromise(createPair))
  .chain(fromPromise(mine))
  .chain(fromPromise(allowOrder))
  .chain(fromPromise(mine))
  .chain(fromPromise(createOrder))
  .chain(fromPromise(mine))
  .chain(fromPromise(readState))
  .fork(
    e => console.log('error: ', e),
    (_) => console.log('end')
  )

async function readState(ctx) {
  const { warp, BAR, NFT } = ctx
  // warp 1.2
  // const barResult = await warp.contract(BAR.CONTRACT)
  //   .connect(NFT.jwk)
  //   .setEvaluationOptions({
  //     internalWrites: true
  //   }).readState().then(({ cachedValue: { state } }) => JSON.stringify(state, null, 2))
  // const nftResult = await warp.contract(NFT.CONTRACT)
  //   .connect(NFT.jwk)
  //   .setEvaluationOptions({
  //     internalWrites: true
  //   }).readState().then(({ cachedValue: { state } }) => JSON.stringify(state, null, 2))
  const barResult = await warp.contract(BAR.CONTRACT)
    .connect(NFT.jwk)
    .setEvaluationOptions({
      internalWrites: true
    }).readState() // .then(({ state }) => JSON.stringify(state, null, 2))
  const nftResult = await warp.contract(NFT.CONTRACT)
    .connect(NFT.jwk)
    .setEvaluationOptions({
      internalWrites: true
    }).readState() //.then(({ state }) => JSON.stringify(state, null, 2))

  console.log('bar', barResult)
  console.log('nft', nftResult)
  return ctx
}

async function createOrder(ctx) {
  const { warp, BAR, NFT, allowTx } = ctx

  const x = await warp.contract(NFT.CONTRACT)
    .connect(BAR.jwk)
    .setEvaluationOptions({
      internalWrites: true
    })
    .writeInteraction({
      function: 'createOrder',
      transaction: allowTx,
      pair: [BAR.CONTRACT, NFT.CONTRACT],
      qty: 10,
      price: 1
    })
  // console.log(x)
  // console.log({ bar: BAR.CONTRACT, nft: NFT.CONTRACT })

  return ctx
}

async function allowOrder(ctx) {
  const { warp, NFT, BAR } = ctx
  const result = await warp.contract(BAR.CONTRACT)
    .connect(NFT.jwk)
    .writeInteraction({
      function: 'allow',
      target: NFT.CONTRACT,
      qty: 10
    })
  //console.log(result)
  return { ...ctx, allowTx: result }
}

async function createPair(ctx) {
  const { warp, NFT, BAR } = ctx
  await warp.contract(NFT.CONTRACT)
    .connect(NFT.jwk)
    .writeInteraction({
      function: 'addPair',
      pair: BAR.CONTRACT
    })

  return ctx
}

async function deployContracts(ctx) {
  const { warp, BAR, NFT } = ctx

  const src = new TextDecoder().decode(
    await readFile('./dist/contract.js')
  )

  const getState = (addr, ticker) => JSON.stringify({
    emergencyHaltWallet: addr,
    ticker,
    halted: false,
    pairs: [],
    invocations: [],
    foreignCalls: [],
    balances: {
      [BAR.address]: 100,
      [NFT.address]: 100,
    },
    claims: [],
    claimable: [],
    settings: [["isTradeable", true]],
  })

  const barResult = await warp.createContract.deploy({
    src,
    wallet: BAR.jwk,
    initState: getState(BAR.address, 'BAR')
  })
  BAR.CONTRACT = barResult.contractTxId

  const nftResult = await warp.createContract.deploy({
    src,
    wallet: NFT.jwk,
    initState: getState(NFT.address, 'NFT')
  })
  NFT.CONTRACT = nftResult.contractTxId

  return ctx
}

async function mine(ctx) {
  await ctx.arweave.api.get('mine')
  return ctx
}

async function triggerFaucet(ctx) {
  const { arweave, BAR, NFT } = ctx
  await arweave.api.get(`mint/${BAR.address}/${arweave.ar.arToWinston('1000')}`)
  await arweave.api.get(`mint/${NFT.address}/${arweave.ar.arToWinston('1000')}`)

  return ctx
}

async function generateWallets(ctx) {
  const { arweave } = ctx
  let BAR = { address: '', jwk: {}, CONTRACT: '' }
  BAR.jwk = await arweave.wallets.generate()
  BAR.address = await arweave.wallets.getAddress(BAR.jwk)

  let NFT = { address: '', jwk: {}, CONTRACT: '' }
  NFT.jwk = await arweave.wallets.generate()
  NFT.address = await arweave.wallets.getAddress(NFT.jwk)

  return { ...ctx, BAR, NFT }
}