import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from 'url';
import { createContract } from "smartweave";
import { WarpNodeFactory } from "warp-contracts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let arweave: Arweave;

async function generateWallets(arweave) {
  let walletA: {
    address: string;
    jwk: JWKInterface;
  } = { address: "", jwk: undefined };
  let walletB: {
    address: string;
    jwk: JWKInterface;
  } = { address: "", jwk: undefined };

  walletA.jwk = await arweave.wallets.generate();
  walletB.jwk = await arweave.wallets.generate();
  walletA.address = await arweave.wallets.getAddress(walletA.jwk);
  walletB.address = await arweave.wallets.getAddress(walletB.jwk);

  return {
    walletA,
    walletB,
  };
}

async function triggerFaucet(arweave, walletA, walletB) {
  await arweave.api.get(`/mint/${walletA.address}/1000000000000`);
  await arweave.api.get(`/mint/${walletB.address}/1000000000000`);
}

async function mine() {
  await arweave.api.get("mine");
}

async function deployContracts(arweave, walletA, walletB) {
  const contractSrc = new TextDecoder().decode(
    await readFile(join(__dirname, "./contract.js"))
  );

  const initialStateA = {
    emergencyHaltWallet: walletA.address,
    ticker: "CONA",
    halted: false,
    pairs: [],
    invocations: [],
    foreignCalls: [],
    balances: {
      [walletA.address]: 100,
      [walletB.address]: 100,
    },
    claims: [],
    claimable: [],
    settings: [["isTradeable", true]],
  };

  const initialStateB = {
    emergencyHaltWallet: walletA.address,
    ticker: "CONB",
    halted: false,
    pairs: [],
    invocations: [],
    foreignCalls: [],
    balances: {
      [walletA.address]: 100,
      [walletB.address]: 100,
    },
    claims: [],
    claimable: [],
    settings: [["isTradeable", true]],
  };

  const contractA = await createContract(
    arweave,
    walletA.jwk,
    contractSrc,
    JSON.stringify(initialStateA)
  );

  const contractB = await createContract(
    arweave,
    walletA.jwk,
    contractSrc,
    JSON.stringify(initialStateB)
  );

  await mine();

  return {
    contractA,
    contractB,
  };
}

async function createPair(arweave, walletA, contractA, contractB) {
  const pairTx = await arweave.createTransaction(
    {
      data: "1234",
    },
    walletA.jwk
  );
  const input = {
    function: "addPair",
    pair: contractA,
  };

  pairTx.addTag("App-Name", "SmartWeaveAction");
  pairTx.addTag("App-Version", "0.3.0");
  pairTx.addTag("Contract", contractB);
  pairTx.addTag("Input", JSON.stringify(input));

  await arweave.transactions.sign(pairTx, walletA.jwk);
  await arweave.transactions.post(pairTx);

  await mine();

  return pairTx.id;
}

async function allowOrder(arweave, walletA, contractA, contractB) {
  const allowTx = await arweave.createTransaction(
    {
      data: "1234",
    },
    walletA.jwk
  );
  const input = {
    function: "allow",
    target: contractB,
    qty: 10,
  };

  allowTx.addTag("App-Name", "SmartWeaveAction");
  allowTx.addTag("App-Version", "0.3.0");
  allowTx.addTag("Contract", contractA);
  allowTx.addTag("Input", JSON.stringify(input));

  await arweave.transactions.sign(allowTx, walletA.jwk);
  await arweave.transactions.post(allowTx);

  await mine();

  return allowTx.id;
}

async function makeOrder(arweave, walletA, contractA, contractB, allowTx) {
  const orderTx = await arweave.createTransaction(
    {
      data: "1234",
    },
    walletA.jwk
  );
  const input = {
    function: "createOrder",
    transaction: allowTx,
    pair: [contractA, contractB],
    qty: 10,
    price: 1,
  };

  orderTx.addTag("App-Name", "SmartWeaveAction");
  orderTx.addTag("App-Version", "0.3.0");
  if (allowTx === "") {
    // Order is on itself
    orderTx.addTag("Contract", contractA);
  } else {
    orderTx.addTag("Contract", contractB);
  }
  orderTx.addTag("Input", JSON.stringify(input));

  await arweave.transactions.sign(orderTx, walletA.jwk);
  await arweave.transactions.post(orderTx);

  await mine();

  return orderTx.id;
}

async function readState(arweave, contract) {
  const warp = WarpNodeFactory.memCachedBased(arweave)
    .useArweaveGateway()
    .build();
  const thing = warp.contract(contract).setEvaluationOptions({
    internalWrites: true
  });

  return await thing.readState();
}

async function flow() {
  // Create 2 wallets
  // Give AR balances to both wallets
  // Create 2 contracts
  // Add pair to contractB
  // walletA create order:
  // Call `allow` on contractA
  // Call `createOrder` on contractB

  arweave = Arweave.init({
    host: "localhost",
    port: 1984,
    protocol: "http",
    timeout: 20000,
    logging: false,
  });

  const { walletA, walletB } = await generateWallets(arweave);

  console.log(`WALLET A: ${walletA.address} \nWALLET B: ${walletB.address}`);
  await triggerFaucet(arweave, walletA, walletB);
  console.log("TRIGGERED FAUCET");
  const { contractA, contractB } = await deployContracts(
    arweave,
    walletA,
    walletB
  );
  console.log(`CONTRACT A: ${contractA}\nCONTRACT B: ${contractB}`);
  const pairTx = await createPair(arweave, walletA, contractA, contractB);
  console.log(`INITIALIZED PAIR TX: ${pairTx}`);

  const matchTx = await makeOrder(arweave, walletB, contractB, contractA, "");
  console.log(`MADE MATCH TX: ${matchTx}`);

  const allowTx = await allowOrder(arweave, walletA, contractA, contractB);
  console.log(`MADE ALLOW TX: ${allowTx}`);
  const orderTx = await makeOrder(
    arweave,
    walletA,
    contractA,
    contractB,
    allowTx
  );
  console.log(`MADE ORDER TX: ${orderTx}`);

  const res1 = await readState(arweave, contractB);
  console.log(JSON.stringify(res1, undefined, 2));

  console.log("\n\n\n\n");
  const res2 = await readState(arweave, contractA);
  console.log(JSON.stringify(res2, undefined, 2));
}

flow();
