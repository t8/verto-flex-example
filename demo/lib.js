const { Async } = require('crocks')
const { readFile } = require('fs/promises')

const { fromPromise } = Async

module.exports = {
  loadContext: fromPromise(
    async function loadContext(ctx) {
      const barText = new TextDecoder().decode(
        await readFile('./bar.json')
      )
      const nftText = new TextDecoder().decode(
        await readFile('./nft.json')
      )
      return { ...ctx, BAR: JSON.parse(barText), NFT: JSON.parse(nftText) }
    }
  ),
  readState: fromPromise(
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
  ),
  createBuyOrder: ({ qty = 10, price = 1 }) => fromPromise(
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
          qty,
          price
        })

      return ctx
    }
  ),
  createSellOrder: ({ qty = 10, price = 1 }) => fromPromise(
    async function createOrder(ctx) {
      const { warp, BAR, NFT, allowTx } = ctx

      const x = await warp.contract(NFT.CONTRACT)
        .connect(type === 'nft' ? NFT.jwk : BAR.jwk)
        .setEvaluationOptions({
          internalWrites: true
        })
        .writeInteraction({
          function: 'createOrder',
          transaction: allowTx,
          pair: [BAR.CONTRACT, NFT.CONTRACT],
          qty,
          price
        })

      return ctx
    }
  ),
  // createOrder: ({ qty = 10, price = 1, type = 'nft' }) => fromPromise(
  //   async function createOrder(ctx) {
  //     const { warp, BAR, NFT, allowTx } = ctx

  //     const x = await warp.contract(NFT.CONTRACT)
  //       .connect(type === 'nft' ? NFT.jwk : BAR.jwk)
  //       .setEvaluationOptions({
  //         internalWrites: true
  //       })
  //       .writeInteraction({
  //         function: 'createOrder',
  //         transaction: allowTx,
  //         pair: [BAR.CONTRACT, NFT.CONTRACT],
  //         qty,
  //         price
  //       })

  //     return ctx
  //   }
  // ),
  allowOrder: ({ qty = 10 }) => fromPromise(
    async function allowOrder(ctx) {
      const { warp, NFT, BAR } = ctx
      const result = await warp.contract(BAR.CONTRACT)
        .connect(BAR.jwk)
        .writeInteraction({
          function: 'allow',
          target: NFT.CONTRACT,
          qty
        })
      //console.log(result)
      return { ...ctx, allowTx: result }
    }
  ),
  createPair: fromPromise(
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
  ),

  deployContracts: fromPromise(
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

  ),
  generateWallets: fromPromise(
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
  ),
  triggerFaucet: fromPromise(
    async function triggerFaucet(ctx) {
      const { arweave, BAR, NFT } = ctx
      await arweave.api.get(`mint/${BAR.address}/${arweave.ar.arToWinston('1000')}`)
      await arweave.api.get(`mint/${NFT.address}/${arweave.ar.arToWinston('1000')}`)

      return ctx
    }
  ),
  mine: fromPromise(
    async function mine(ctx) {
      await ctx.arweave.api.get('mine')
      return ctx
    }
  )

}
