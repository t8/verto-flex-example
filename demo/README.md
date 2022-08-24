# BUY/SELL NFT Demo

This demo walks through the process of buying and selling an 100 tokens of an NFT using flex

Step 1: 

`node demo/setup.js`

This creates two wallets and two contracts, wallet BAR has 100 BAR in the BAR contract wallet NFT has 10000 tokens in the NFT contract.

Step 2: NFT Wallet wants to place 100 tokens of his NFT for 0.01 BAR

`node demo/sell-nft.js`

Step 3: BAR Wallet wants to buy 100 tokens of the NFT for 0.01 BAR

`node demo/buy-nft.js`

---

> NOTE this demo uses ADTs so code may look a little confusing, the async code is in the `./demo/lib.js` and each run file contains a pipeline of each step, so you can see at a high level what is required for Buy and Sell.
