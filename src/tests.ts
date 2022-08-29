import fs from "fs";
import path from "path";
import { Contract, LoggerFactory, WarpFactory } from "warp-contracts";
import ArLocal from "arlocal";
import { JWKInterface } from "arweave/node/lib/wallet";
import { StateInterface } from "./faces";

// note: setting global logging level to 'error' to reduce logging.
LoggerFactory.INST.logLevel("error");

// the 'forLocal' version uses by default inMemory cache - so no cache files are saved between test runs
const warp = WarpFactory.forLocal();

type Wallet = {
  address: string;
  jwk: JWKInterface;
};

async function generateWallets() {
  // note: this automatically adds funds to the generated wallet
  const walletAJwk = await warp.testing.generateWallet();
  const walletBJwk = await warp.testing.generateWallet();

  // note to myself: SDK should probably return this 'Wallet' type from 'generateWallet' function
  // (instead of returning JWKInterface only)
  let walletA: Wallet = {
    jwk: walletAJwk,
    address: await warp.arweave.wallets.getAddress(walletAJwk),
  };
  let walletB: Wallet = {
    jwk: walletBJwk,
    address: await warp.arweave.wallets.getAddress(walletBJwk),
  };

  return {
    walletA,
    walletB,
  };
}

async function deployContracts(
  walletA: Wallet,
  walletB: Wallet
): Promise<{
  contractA: Contract<StateInterface>;
  contractB: Contract<StateInterface>;
}> {
  const contractSrc = fs.readFileSync(
    path.join(__dirname, "../", "dist/contract.js"),
    "utf8"
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

  let contractATxId, contractBTxId;

  ({ contractTxId: contractATxId } = await warp.createContract.deploy({
    wallet: walletA.jwk,
    initState: JSON.stringify(initialStateA),
    src: contractSrc,
  }));

  ({ contractTxId: contractBTxId } = await warp.createContract.deploy({
    wallet: walletB.jwk,
    initState: JSON.stringify(initialStateB),
    src: contractSrc,
  }));

  await warp.testing.mineBlock();

  const contractA = warp
    .contract<StateInterface>(contractATxId)
    .setEvaluationOptions({
      internalWrites: true,
    });

  const contractB = warp
    .contract<StateInterface>(contractBTxId)
    .setEvaluationOptions({
      internalWrites: true,
    });

  return {
    contractA,
    contractB,
  };
}

async function createPair(
  walletA: JWKInterface,
  contractA: Contract<StateInterface>,
  contractB: Contract<StateInterface>
) {
  // creates a pair on "ContractB" from "walletA"
  // note: "writeInteraction" in "local" env. makes automatic block mining
  const { originalTxId } = await contractB.connect(walletA).writeInteraction({
    function: "addPair",
    pair: contractA.txId(),
  });

  /*const pairTx = await arweave.createTransaction(
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

  await mine();*/

  return originalTxId;
}

async function allowOrder(
  walletA: JWKInterface,
  contractA: Contract<StateInterface>,
  contractB: Contract<StateInterface>
) {
  // allows order on "ContractA" from "walletA" to target "ContractB"
  const { originalTxId } = await contractA.connect(walletA).writeInteraction({
    function: "allow",
    target: contractB.txId(),
    qty: 10,
  });

  /*const allowTx = await arweave.createTransaction(
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

  await mine();*/

  return originalTxId;
}

async function makeOrder(
  walletA: JWKInterface,
  contractA: Contract<StateInterface>,
  contractB: Contract<StateInterface>,
  allowTx: string
) {
  let contract = allowTx === "" ? contractA : contractB;

  const { originalTxId } = await contract.connect(walletA).writeInteraction({
    function: "createOrder",
    transaction: allowTx,
    pair: [contractA.txId(), contractB.txId()],
    qty: 10,
    price: 1,
  });

  /* const orderTx = await arweave.createTransaction(
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

   await mine();*/

  return originalTxId;
}

async function flow() {
  // Create 2 wallets
  // Give AR balances to both wallets
  // Create 2 contracts
  // Add pair to contractB
  // walletA create order:
  // Call `allow` on contractA
  // Call `createOrder` on contractB

  let arLocal;
  try {
    console.log("Starting ArLocal");
    arLocal = new ArLocal(1984, false);
    await arLocal.start();

    const { walletA, walletB } = await generateWallets();
    console.log("Wallets", {
      walletA: walletA.address,
      walletB: walletB.address,
    });

    const { contractA, contractB } = await deployContracts(walletA, walletB);
    console.log("Contracts", {
      contractA: contractA.txId(),
      contractB: contractB.txId(),
    });

    const pairTx = await createPair(walletA.jwk, contractA, contractB);
    console.log(`INITIALIZED PAIR TX: ${pairTx}`);

    const matchTx = await makeOrder(walletB.jwk, contractB, contractA, "");
    console.log(`MADE MATCH TX: ${matchTx}`);

    const allowTx = await allowOrder(walletA.jwk, contractA, contractB);
    console.log(`MADE ALLOW TX: ${allowTx}`);

    const orderTx = await makeOrder(walletA.jwk, contractA, contractB, allowTx);
    console.log(`MADE ORDER TX: ${orderTx}`);

    console.log("\n === Contract B state ===\n");
    const contractBResult = await contractB.readState();
    console.dir(contractBResult.cachedValue.state, { depth: null });

    console.log("\n\n === Contract A state ===\n");
    const contractAResult = await contractA.readState();
    console.dir(contractAResult.cachedValue.state, { depth: null });
  } finally {
    console.log("Stopping ArLocal");
    await arLocal.stop();
  }
}

flow().finally(() => {
  console.log("flow done");
});
