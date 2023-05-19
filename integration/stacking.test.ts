import {
  buildDevnetNetworkOrchestrator,
  DEFAULT_EPOCH_TIMELINE,
  getAccount,
  getBitcoinBlockHeight,
  getBlockPoxAddresses,
  getBlockRewards,
  getNetworkIdFromEnv,
  getPoolMembers,
  getScLockedBalance,
  getStackerWeight,
  readRewardCyclePoxAddressForAddress,
  readRewardCyclePoxAddressListAtIndex,
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
  broadcastJoinPool,
  broadcastReserveStxOwner,
  broadcastRewardDistribution,
  broadcastUpdateScBalances,
} from "./helper-fp";
import { expect } from "chai";
import { uintCV } from "@stacks/transactions";

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
    let metadata = chainUpdate.new_blocks[0].block.transactions[1]["metadata"];
    expect((metadata as any)["success"]).toBe(true);
    expect((metadata as any)["result"]).toBe("(ok true)");

    // TODO: Add reserve-funds-future-rewards

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
    await broadcastReserveStxOwner({
      amountUstx: 11_000_000_000,
      nonce: (await getAccount(network, Accounts.DEPLOYER.stxAddress)).nonce,
      network: network,
      user: Accounts.DEPLOYER,
    });
    chainUpdate = await orchestrator.waitForNextStacksBlock();
    // metadata = chainUpdate.new_blocks[0].block.transactions[1]["metadata"];
    // expect((metadata as any)["success"]).toBe(true);
    // expect((metadata as any)["result"]).toBe("(ok true)");
    // chainUpdate = await orchestrator.waitForNextStacksBlock();

    for (
      let i = 1;
      i < chainUpdate.new_blocks[0].block.transactions.length;
      i++
    ) {
      let metadataAllowI =
        chainUpdate.new_blocks[0].block.transactions[i]["metadata"];
      expect((metadataAllowI as any)["success"]).toBe(true);
      expect((metadataAllowI as any)["result"]).toBe("(ok true)");
    }

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

    // modified here to be greater than min_threshold_ustx
    await broadcastDelegateStx({
      amountUstx: 50_286_942_145_278, // pox activation threshold
      user: usersList[2],
      nonce: (await getAccount(network, usersList[2].stxAddress)).nonce,
      network,
    });

    chainUpdate = await orchestrator.waitForNextStacksBlock();
    console.log("delegations:", chainUpdate.new_blocks[0].block.transactions);

    for (
      let i = 1;
      i < chainUpdate.new_blocks[0].block.transactions.length;
      i++
    ) {
      let metadataDelegateI =
        chainUpdate.new_blocks[0].block.transactions[i]["metadata"];
      expect((metadataDelegateI as any)["success"]).toBe(true);
      expect((metadataDelegateI as any)["result"]).toBe("(ok false)");
    }

    chainUpdate = await orchestrator.waitForNextStacksBlock();
    for (
      let i = 1;
      i < chainUpdate.new_blocks[0].block.transactions.length;
      i++
    ) {
      let metadataDelegateI =
        chainUpdate.new_blocks[0].block.transactions[i]["metadata"];
      expect((metadataDelegateI as any)["success"]).toBe(true);
      expect((metadataDelegateI as any)["result"]).toBe("(ok true)");
    }
    chainUpdate = await orchestrator.waitForNextStacksBlock();
    for (
      let i = 1;
      i < chainUpdate.new_blocks[0].block.transactions.length;
      i++
    ) {
      let metadataDelegateI =
        chainUpdate.new_blocks[0].block.transactions[i]["metadata"];
      expect((metadataDelegateI as any)["success"]).toBe(true);
      expect((metadataDelegateI as any)["result"]).toBe("(ok true)");
    }

    // Friedger check table entry:

    let poxInfo = await getPoxInfo(network);
    console.log("pox info CURRENT CYCLE:", poxInfo.current_cycle);
    console.log("pox info NEXT CYCLE:", poxInfo.next_cycle);

    const poxAddrInfo0 = await readRewardCyclePoxAddressForAddress(
      network,
      2,
      Accounts.DEPLOYER.stxAddress
    );

    expect(poxAddrInfo0).toBeNull();
    console.log("POX ADDRESS INFO WALLET 1", poxAddrInfo0);

    const poxAddrInfo1 = await readRewardCyclePoxAddressListAtIndex(
      network,
      3,
      0
    );

    expect(poxAddrInfo1?.["total-ustx"]).toEqual(uintCV(50_536_942_145_278)); // 375_000_000_000 before
    console.log("POX ADDRESS INFO POOL", poxAddrInfo1);

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

    getPoolMembers(network);

    await broadcastUpdateScBalances({
      user: Accounts.DEPLOYER,
      nonce: (await getAccount(network, Accounts.DEPLOYER.stxAddress)).nonce,
      network,
    });

    chainUpdate = await orchestrator.waitForNextStacksBlock();

    let metadataUpdateBalances =
      chainUpdate.new_blocks[0].block.transactions[1]["metadata"];
    expect((metadataUpdateBalances as any)["success"]).toBe(true);
    expect((metadataUpdateBalances as any)["result"]).toBe("(ok true)");

    console.log(
      "** " +
        (chainUpdate.new_blocks[0].block.metadata as StacksBlockMetadata)
          .bitcoin_anchor_block_identifier.index
    );

    await getScLockedBalance(network);

    await getStackerWeight(network, usersList[0].stxAddress, 3);
    await getStackerWeight(network, usersList[1].stxAddress, 3);
    await getStackerWeight(network, usersList[2].stxAddress, 3);
    await getStackerWeight(network, usersList[3].stxAddress, 3);

    chainUpdate = await waitForRewardCycleId(network, orchestrator, 4);
    console.log(
      "** " +
        (chainUpdate.new_blocks[0].block.metadata as StacksBlockMetadata)
          .bitcoin_anchor_block_identifier.index
    );

    await getBlockPoxAddresses(network, Accounts.DEPLOYER.stxAddress, 130);
    await getBlockPoxAddresses(network, Accounts.DEPLOYER.stxAddress, 131);
    await getBlockPoxAddresses(network, Accounts.DEPLOYER.stxAddress, 132);
    await getBlockPoxAddresses(network, Accounts.DEPLOYER.stxAddress, 133);

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
  });
});
