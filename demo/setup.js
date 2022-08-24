const { WarpNodeFactory } = require('warp-contracts')
const Arweave = require('arweave')
const { readFile, writeFile } = require('fs/promises')
const { Async } = require('crocks')
const { generateWallets, triggerFaucet, deployContracts, mine } = require('./lib')

const { of, fromPromise } = Async
const arweave = Arweave.init({ host: 'localhost', port: '1984', protocol: 'http' })
const warp = WarpNodeFactory.forTesting(arweave)

of({ warp, arweave })
  .chain(generateWallets)
  .chain(triggerFaucet)
  .chain(mine)
  .chain(deployContracts)
  .fork(
    e => console.log('error', e.message),
    async ({ BAR, NFT }) => {
      await writeFile('./bar.json', JSON.stringify(BAR))
      await writeFile('./nft.json', JSON.stringify(NFT))
      console.log('setup complete!')
    }
  )