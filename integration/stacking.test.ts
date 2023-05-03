import {
  buildDevnetNetworkOrchestrator,
  DEFAULT_EPOCH_TIMELINE,
  getAccount,
  getBitcoinBlockHeight,
  getBlockRewards,
  getNetworkIdFromEnv,
  getScLockedBalance,
  getStackerWeight,
} from "./helpers";
import {
  broadcastStackSTX,
  waitForNextPreparePhase,
  waitForNextRewardPhase,
  getPoxInfo,
  waitForRewardCycleId,
  initiateStacking,
  createVault,
  getStackerInfo,
  stackIncrease,
} from "./helpers";
import { Accounts } from "./constants";
import { StacksTestnet } from "@stacks/network";
import {
  DevnetNetworkOrchestrator,
  StacksBlockMetadata,
} from "@hirosystems/stacks-devnet-js";

import { broadcastAllowContractCallerContracCall } from "./allowContractCaller";
import { afterAll, beforeAll, describe, it } from "vitest";
import {
  broadcastDelegateStackStx,
  broadcastDelegateStx,
  broadcastDepositStxOwner,
  broadcastGetScLockedBalance,
  broadcastGetStackerWeight,
  broadcastJoinPool,
  broadcastRewardDistribution,
  broadcastUpdateScBalances,
} from "./helper-fp";
import { expect } from "chai";

describe("testing stacking under epoch 2.1", () => {
  let orchestrator: DevnetNetworkOrchestrator;
  let timeline = DEFAULT_EPOCH_TIMELINE;

  beforeAll(() => {
    orchestrator = buildDevnetNetworkOrchestrator(getNetworkIdFromEnv());
    orchestrator.start(120000);
  });

  afterAll(() => {
    orchestrator.terminate();
  });

  // it("allow pool SC in pox-2", async () => {
  //   const network = new StacksTestnet({ url: orchestrator.getStacksNodeUrl() });
  // });

  // it("delegate after allowing pool SC in pox-2 and joining the pool", async () => {
  //   const network = new StacksTestnet({ url: orchestrator.getStacksNodeUrl() });

  //   await orchestrator.waitForStacksBlockAnchoredOnBitcoinBlockOfHeight(
  //     timeline.pox_2_activation + 1,
  //     5,
  //     true
  //   );

  //   let chainUpdate = await waitForRewardCycleId(network, orchestrator, 2);
  //   console.log("chain update", chainUpdate.new_blocks[0].block.metadata);

  //   let poxInfo = await getPoxInfo(network);
  //   console.log("PoxInfo, Pre conventional stacking:", poxInfo);

  //   let nonceUpdated = (await getAccount(network, Accounts.WALLET_4.stxAddress))
  //     .nonce;

  //   await broadcastAllowContractCallerContracCall({
  //     network: network,
  //     nonce: nonceUpdated,
  //     senderKey: Accounts.WALLET_4.secretKey,
  //   });

  //   chainUpdate = await orchestrator.waitForNextStacksBlock();
  //   let tx = await chainUpdate.new_blocks[0].block.transactions[1];
  //   console.log("tx Allow Contract Caller", tx);
  //   let metadata = await chainUpdate.new_blocks[0].block.transactions[1][
  //     "metadata"
  //   ];
  //   expect((metadata as any)["success"]).toBe(true);
  //   expect((metadata as any)["result"]).toBe("(ok true)");

  //   nonceUpdated = (await getAccount(network, Accounts.WALLET_4.stxAddress))
  //     .nonce;

  //   await broadcastJoinPool({
  //     nonce: nonceUpdated,
  //     network,
  //     user: Accounts.WALLET_4,
  //   });

  //   chainUpdate = await orchestrator.waitForNextStacksBlock();
  //   tx = await chainUpdate.new_blocks[0].block.transactions[1];
  //   console.log("tx Join Stacking Pool", tx);
  //   metadata = await chainUpdate.new_blocks[0].block.transactions[1][
  //     "metadata"
  //   ];
  //   expect((metadata as any)["success"]).toBe(true);
  //   expect((metadata as any)["result"]).toBe("(ok true)");

  //   nonceUpdated = (await getAccount(network, Accounts.WALLET_4.stxAddress))
  //     .nonce;

  //   await broadcastDelegateStx({
  //     amountUstx: 125_000_000_000_000,
  //     user: Accounts.WALLET_4,
  //     nonce: nonceUpdated,
  //     network,
  //   });

  //   chainUpdate = await orchestrator.waitForNextStacksBlock();
  //   tx = await chainUpdate.new_blocks[0].block.transactions[1];
  //   console.log("tx Delegate STX", tx);
  //   metadata = chainUpdate.new_blocks[0].block.transactions[1]["metadata"];
  //   expect((metadata as any)["success"]).toBe(true);
  //   expect((metadata as any)["result"]).toBe("(ok true)");

  //   console.log(await getAccount(network, Accounts.WALLET_4.stxAddress));
  // });

  it("whole flow 5 stackers", async () => {
    const network = new StacksTestnet({ url: orchestrator.getStacksNodeUrl() });

    let usersList = [
      Accounts.WALLET_8,
      Accounts.WALLET_1,
      Accounts.WALLET_2,
      Accounts.WALLET_3,
    ];

    let nonceUpdated = (await getAccount(network, Accounts.DEPLOYER.stxAddress))
      .nonce;
    await broadcastDepositStxOwner({
      amountUstx: 11_000_000_000,
      nonce: nonceUpdated,
      network: network,
      user: Accounts.DEPLOYER,
    });
    let chainUpdate = await orchestrator.waitForNextStacksBlock();
    let tx = await chainUpdate.new_blocks[0].block.transactions[1];
    // console.log("tx Deposit STX Owner:", tx);
    let metadata = chainUpdate.new_blocks[0].block.transactions[1]["metadata"];
    expect((metadata as any)["success"]).toBe(true);
    expect((metadata as any)["result"]).toBe("(ok true)");

    await orchestrator.waitForStacksBlockAnchoredOnBitcoinBlockOfHeight(
      timeline.pox_2_activation + 1,
      10,
      true
    );

    console.log(await getPoxInfo(network));

    console.log(chainUpdate.new_blocks[0].block.metadata);
    console.log(
      "DEPLOYER NONCE:",
      (await getAccount(network, Accounts.DEPLOYER.stxAddress)).nonce,
      "WALLET_1 NONCE:",
      (await getAccount(network, Accounts.WALLET_1.stxAddress)).nonce
    );

    await broadcastAllowContractCallerContracCall({
      network,
      nonce: (await getAccount(network, usersList[0].stxAddress)).nonce,
      senderKey: usersList[0].secretKey,
    });

    await broadcastAllowContractCallerContracCall({
      network,
      nonce: (await getAccount(network, usersList[1].stxAddress)).nonce,
      senderKey: usersList[1].secretKey,
    });

    await broadcastAllowContractCallerContracCall({
      network,
      nonce: (await getAccount(network, usersList[2].stxAddress)).nonce,
      senderKey: usersList[2].secretKey,
    });

    chainUpdate = await orchestrator.waitForNextStacksBlock();
    console.log(chainUpdate.new_blocks[0].block.transactions);

    for (let i = 0; i < usersList.length - 1; i++) {
      await broadcastJoinPool({
        nonce: (await getAccount(network, usersList[i].stxAddress)).nonce,
        network,
        user: usersList[i],
      });
    }
    chainUpdate = await orchestrator.waitForNextStacksBlock();

    for (let i = 1; i < usersList.length; i++) {
      metadata = chainUpdate.new_blocks[0].block.transactions[i]["metadata"];
      expect((metadata as any)["success"]).toBe(true);
      expect((metadata as any)["result"]).toBe("(ok true)");
    }

    await broadcastDelegateStx({
      amountUstx: 125_000_000_000,
      user: usersList[0],
      nonce: (await getAccount(network, usersList[0].stxAddress)).nonce,
      network,
    });

    await broadcastDelegateStx({
      amountUstx: 125_000_000_000,
      user: usersList[1],
      nonce: (await getAccount(network, usersList[1].stxAddress)).nonce,
      network,
    });

    await broadcastDelegateStx({
      amountUstx: 125_000_000_000,
      user: usersList[2],
      nonce: (await getAccount(network, usersList[2].stxAddress)).nonce,
      network,
    });

    chainUpdate = await orchestrator.waitForNextStacksBlock();
    console.log("delegations:", chainUpdate.new_blocks[0].block.transactions);
    chainUpdate = await orchestrator.waitForNextStacksBlock();
    chainUpdate = await orchestrator.waitForNextStacksBlock();

    console.log(
      "first user:",
      await getAccount(network, usersList[0].stxAddress)
    );
    console.log(
      "second user:",
      await getAccount(network, usersList[1].stxAddress)
    );
    console.log(
      "third user:",
      await getAccount(network, usersList[2].stxAddress)
    );
    console.log(
      "fourth user:",
      await getAccount(network, usersList[3].stxAddress)
    );

    console.log(
      "** " +
        (chainUpdate.new_blocks[0].block.metadata as StacksBlockMetadata)
          .bitcoin_anchor_block_identifier.index
    );

    chainUpdate = await orchestrator.waitForNextStacksBlock();

    await broadcastUpdateScBalances({
      user: Accounts.WALLET_1,
      nonce: (await getAccount(network, Accounts.WALLET_1.stxAddress)).nonce,
      network,
    });

    chainUpdate = await orchestrator.waitForNextStacksBlock();

    console.log(
      "update SC balances",
      chainUpdate.new_blocks[0].block.transactions[1]
    );

    console.log(
      "** " +
        (chainUpdate.new_blocks[0].block.metadata as StacksBlockMetadata)
          .bitcoin_anchor_block_identifier.index
    );

    await getScLockedBalance(network);

    await getStackerWeight(network, Accounts.WALLET_1.stxAddress, 3);

    chainUpdate = await waitForRewardCycleId(network, orchestrator, 14);
    console.log(
      "** " +
        (chainUpdate.new_blocks[0].block.metadata as StacksBlockMetadata)
          .bitcoin_anchor_block_identifier.index
    );
    // chainUpdate = await orchestrator.waitForNextStacksBlock();
    // chainUpdate = await orchestrator.waitForNextStacksBlock();
    // chainUpdate = await orchestrator.waitForNextStacksBlock();
    // chainUpdate = await orchestrator.waitForNextStacksBlock();
    // chainUpdate = await orchestrator.waitForNextStacksBlock();
    // chainUpdate = await orchestrator.waitForNextStacksBlock();
    // chainUpdate = await orchestrator.waitForNextStacksBlock();
    // burn block 135
    await getBlockRewards(network, Accounts.DEPLOYER.stxAddress, 130);
    await getBlockRewards(network, Accounts.DEPLOYER.stxAddress, 131);
    await getBlockRewards(network, Accounts.DEPLOYER.stxAddress, 132);
    await getBlockRewards(network, Accounts.DEPLOYER.stxAddress, 133);

    await broadcastRewardDistribution({
      burnBlockHeight: 130,
      network,
      user: Accounts.DEPLOYER,
      nonce: (await getAccount(network, Accounts.DEPLOYER.stxAddress)).nonce,
    });

    await broadcastRewardDistribution({
      burnBlockHeight: 131,
      network,
      user: Accounts.WALLET_1,
      nonce: (await getAccount(network, Accounts.WALLET_1.stxAddress)).nonce,
    });

    await broadcastRewardDistribution({
      burnBlockHeight: 132,
      network,
      user: Accounts.WALLET_2,
      nonce: (await getAccount(network, Accounts.WALLET_2.stxAddress)).nonce,
    });

    await broadcastRewardDistribution({
      burnBlockHeight: 133,
      network,
      user: Accounts.WALLET_8,
      nonce: (await getAccount(network, Accounts.WALLET_8.stxAddress)).nonce,
    });

    chainUpdate = await orchestrator.waitForNextStacksBlock();
    console.log(chainUpdate.new_blocks[0].block.transactions);

    chainUpdate = await orchestrator.waitForNextStacksBlock();
    console.log(chainUpdate.new_blocks[0].block.transactions);
  });
});
