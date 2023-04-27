import { allowContractCaller } from "./client/pox-2-client.ts";
import {
  delegateStx,
  fpDelegationAllowContractCaller,
  getUserData,
  joinStackingPool,
} from "./client/main-client.ts";
import { Clarinet, Chain, Account, Tx, types } from "./deps.ts";
import {
  Errors,
  PoxErrors,
  poxAddrFP,
  poxAddrPool1,
  poxAddrPool2,
} from "./constants.ts";

import {
  expectPartialStackedByCycle,
  expectTotalStackedByCycle,
} from "./utils.ts";

Clarinet.test({
  name: "Ensure that user can't delegate without allowance",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet_1 = accounts.get("wallet_1")!;

    // try without any allowance
    let block = chain.mineBlock([delegateStx(20_000_000_000_000, wallet_1)]);

    // check delegation calls
    block.receipts[0].result.expectErr().expectUint(Errors.AllowPoolInPox2);
  },
});

Clarinet.test({
  name: "Ensure that user can't join the pool without allowance",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet_1 = accounts.get("wallet_1")!;

    // try without any allowance
    let block = chain.mineBlock([joinStackingPool(wallet_1)]);

    // check error to be returned
    block.receipts[0].result.expectErr().expectUint(Errors.AllowPoolInPox2);
  },
});

Clarinet.test({
  name: "Ensure that user can join the pool after allowing pool SC in pox-2 contract",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const mainContract = deployer.address + ".main";

    // try without any allowance
    let block = chain.mineBlock([
      allowContractCaller(mainContract, undefined, wallet_1),
      joinStackingPool(wallet_1),
    ]);

    // check that both calls above return true
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
  },
});

Clarinet.test({
  name: "Ensure that user can only delegate from a contract allowing pox-2 and joining the pool",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const mainDelegateStx = (amountUstx: number, user: Account) => {
      return Tx.contractCall(
        "main",
        "delegate-stx",
        [types.uint(amountUstx)],
        user.address
      );
    };
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;
    const mainContract = deployer.address + ".main";

    // try without any allowance
    let block = chain.mineBlock([mainDelegateStx(20_000_000_000, wallet_1)]);
    block.receipts[0].result.expectErr().expectUint(Errors.AllowPoolInPox2);

    // try with pox allowance only
    block = chain.mineBlock([
      allowContractCaller(mainContract, undefined, wallet_1),
      mainDelegateStx(20_000_000_000_000, wallet_1),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectErr().expectUint(Errors.NotInPool);

    // delegate-stx with pox-2 allowance and joining the pool
    block = chain.mineBlock([
      joinStackingPool(wallet_1),
      mainDelegateStx(20_000_000_000_000, wallet_1),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    expectTotalStackedByCycle(1, 0, 20_000_000_000_000, chain, deployer);
  },
});

Clarinet.test({
  name: "Ensure that user can delegate how much he wants, but can lock only funds he owns",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const mainDelegateStx = (amountUstx: number, user: Account) => {
      return Tx.contractCall(
        "main",
        "delegate-stx",
        [types.uint(amountUstx)],
        user.address
      );
    };
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;
    const mainContract = deployer.address + ".main";

    // user owns 100_000_000_000_000, delegates 200_000_000_000_000
    let block = chain.mineBlock([
      allowContractCaller(mainContract, undefined, wallet_1),
      joinStackingPool(wallet_1),
      mainDelegateStx(200_000_000_000_000, wallet_1),
      getUserData(wallet_1, wallet_1),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    console.log(
      "200_000_000_000_000 delegated, 100_000_000_000_000 locked:",
      block.receipts[3].result
    );
    // check total to be 100_000_000_000_000 instead of what user has delegated
    expectTotalStackedByCycle(1, 0, 100_000_000_000_000, chain, deployer);

    block = chain.mineBlock([
      allowContractCaller(mainContract, undefined, wallet_2),
      joinStackingPool(wallet_2),
      mainDelegateStx(400_000_000_000_000, wallet_2),
      getUserData(wallet_2, wallet_2),
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    console.log(
      "400_000_000_000_000 delegated, 100_000_000_000_000 locked:",
      block.receipts[3].result
    );
    // check total to be 200_000_000_000_000 (100_000_000_000_000 + 100_000_000_000_000 already stacked) instead of what user has delegated
    expectTotalStackedByCycle(1, 0, 200_000_000_000_000, chain, deployer);
  },
});

Clarinet.test({
  name: "Ensure that user can delegate how much he wants, but it will be locked just when the threshold is met",
  // stx_liq_supply / threshold_25 == 1_000_000_000_000_000 / 20_000_000_000 = 50_000

  async fn(chain: Chain, accounts: Map<string, Account>) {
    const mainDelegateStx = (amountUstx: number, user: Account) => {
      return Tx.contractCall(
        "main",
        "delegate-stx",
        [types.uint(amountUstx)],
        user.address
      );
    };
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;
    const mainContract = deployer.address + ".main";

    // Allow pool SC in pox-2, join stacking pool and delegate with wallet_1
    let block = chain.mineBlock([
      allowContractCaller(mainContract, undefined, wallet_1),
      joinStackingPool(wallet_1),
      mainDelegateStx(1_000_000_000, wallet_1), // < 50_000_000_000 uSTX
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(false); // expect false, commit ignored
    console.log(block.receipts[2]); // {err-commit-ignored:11}

    // Check local user data
    block = chain.mineBlock([
      getUserData(wallet_1, deployer),
      getUserData(wallet_2, deployer),
    ]);
    console.log(
      "delegated == locked == 1_000_000_000:",
      block.receipts[0].result
    ); // verify delegated-balance==locked-balance==1_000_000_000
    console.log(block.receipts[1].result); // verify is-none - not in stacking pool yet
    block.receipts[0].result.expectSome();
    block.receipts[1].result.expectNone();

    expectPartialStackedByCycle(poxAddrFP, 1, 0, chain, deployer); // does not commit partially
    expectTotalStackedByCycle(1, 0, 0, chain, deployer); // does not commit totally

    // Allow pool SC in pox-2, join stacking pool and delegate with wallet_2
    block = chain.mineBlock([
      allowContractCaller(mainContract, undefined, wallet_2),
      joinStackingPool(wallet_2),
      mainDelegateStx(49_000_000_000, wallet_2), // < 50_000_000_000 uSTX
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    console.log(block.receipts[2]); // no print, returns ok true => amount commited

    expectPartialStackedByCycle(poxAddrFP, 1, 0, chain, deployer); // does not commit partially
    expectTotalStackedByCycle(1, 0, 50_000_000_000, chain, deployer); // commits totally the amount wallet_1 + wallet_2 delegated

    block = chain.mineBlock([
      getUserData(wallet_1, deployer),
      getUserData(wallet_2, deployer),
    ]);
    console.log(
      "delegated-balance==locked-balance== 1_000_000_000:",
      block.receipts[0].result
    ); // verify delegated-balance==locked-balance== 1_000_000_000
    console.log(
      "delegated-balance==locked-balance==49_000_000_000:",
      block.receipts[1].result
    ); // verify delegated-balance==locked-balance==49_000_000_000
  },
});

Clarinet.test({
  name: "Ensure stack is extended",
  // stx_liq_supply / threshold_25 == 1_000_000_000_000_000 / 20_000_000_000 = 50_000

  async fn(chain: Chain, accounts: Map<string, Account>) {
    const mainDelegateStx = (amountUstx: number, user: Account) => {
      return Tx.contractCall(
        "main",
        "delegate-stx",
        [types.uint(amountUstx)],
        user.address
      );
    };
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;
    const mainContract = deployer.address + ".main";

    // Allow pool SC in pox-2, join stacking pool and delegate with wallet_1
    let block = chain.mineBlock([
      allowContractCaller(mainContract, undefined, wallet_1),
      joinStackingPool(wallet_1),
      mainDelegateStx(1_000_000_000, wallet_1), // < 50_000_000_000 uSTX
    ]);
    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(false); // expect false, commit ignored
    console.log(block.receipts[2]); // {err-commit-ignored:11}

    // Check local user data
    block = chain.mineBlock([getUserData(wallet_1, deployer)]);
    console.log(
      "delegated == locked == 1_000_000_000:",
      block.receipts[0].result
    ); // verify delegated-balance==locked-balance==1_000_000_000
    block.receipts[0].result.expectSome();

    expectPartialStackedByCycle(poxAddrFP, 1, 0, chain, deployer); // does not commit partially
    expectTotalStackedByCycle(1, 0, 0, chain, deployer); // does not commit totally

    for (let i = 1; i <= 4198; i++) {
      block = chain.mineBlock([]);
    }

    block = chain.mineBlock([
      mainDelegateStx(50_000_000_000, wallet_1), // < 50_000_000_000 uSTX
    ]);
    block.receipts[0].result.expectOk().expectBool(true); // expect true, lock funds

    block = chain.mineBlock([getUserData(wallet_1, deployer)]);

    console.log(block.receipts[0].result);
  },
});
