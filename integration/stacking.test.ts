import {
  buildDevnetNetworkOrchestrator,
  DEFAULT_EPOCH_TIMELINE,
  getAccount,
  getBitcoinBlockHeight,
  getNetworkIdFromEnv,
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

  it("allow pool SC in pox-2", async () => {
    const network = new StacksTestnet({ url: orchestrator.getStacksNodeUrl() });
  });

  it("delegate after allowing pool SC in pox-2 and joining the pool", async () => {
    const network = new StacksTestnet({ url: orchestrator.getStacksNodeUrl() });

    // let chainUpdate = await waitForRewardCycleId(network, orchestrator, 2);
    // console.log("chain update", chainUpdate.new_blocks[0].block.metadata);

    let poxInfo = await getPoxInfo(network);
    console.log("PoxInfo, Pre conventional stacking:", poxInfo);

    await orchestrator.waitForNextStacksBlock();
    await orchestrator.waitForNextStacksBlock();
    await orchestrator.waitForNextStacksBlock();

    await broadcastAllowContractCallerContracCall({
      network,
      nonce: (await getAccount(network, Accounts.WALLET_4.stxAddress)).nonce,
      senderKey: Accounts.WALLET_4.secretKey,
    });

    let chainUpdate = await orchestrator.waitForNextStacksBlock();
    console.log(
      "** " +
        (chainUpdate.new_blocks[0].block.metadata as StacksBlockMetadata)
          .bitcoin_anchor_block_identifier.index
    );
    let metadata = chainUpdate.new_blocks[0].block.transactions[1].metadata;
    expect((metadata as any)["success"]).toBe(true);
    expect((metadata as any)["result"]).toBe("(ok true)");

    await broadcastJoinPool({
      nonce: (await getAccount(network, Accounts.WALLET_4.stxAddress)).nonce,
      network,
      user: Accounts.WALLET_4,
    });

    chainUpdate = await orchestrator.waitForNextStacksBlock();
    metadata = chainUpdate.new_blocks[0].block.transactions[1].metadata;
    expect((metadata as any)["success"]).toBe(true);
    expect((metadata as any)["result"]).toBe("(ok true)");

    await broadcastDelegateStx({
      amountUstx: 125_000_000_000,
      user: Accounts.WALLET_4,
      nonce: (await getAccount(network, Accounts.WALLET_4.stxAddress)).nonce,
      network,
    });
    chainUpdate = await orchestrator.waitForNextStacksBlock();
    metadata = chainUpdate.new_blocks[0].block.transactions[1].metadata;
    expect((metadata as any)["success"]).toBe(true);
    expect((metadata as any)["result"]).toBe("(ok true)");

    // await waitForRewardCycleId(network, orchestrator, 3);
    // chainUpdate = await orchestrator.waitForNextStacksBlock();
    // console.log(
    //   "** " +
    //     (chainUpdate.new_blocks[0].block.metadata as StacksBlockMetadata)
    //       .bitcoin_anchor_block_identifier.index
    // );
    // console.log("\n", JSON.stringify(chainUpdate));

    // console.log(JSON.stringify(chainUpdate));

    // await waitForRewardCycleId(network, orchestrator, 4);

    // chainUpdate = await orchestrator.waitForNextStacksBlock();
    // console.log(
    //   "** " +
    //     (chainUpdate.new_blocks[0].block.metadata as StacksBlockMetadata)
    //       .bitcoin_anchor_block_identifier.index
    // );
    // console.log(JSON.stringify(chainUpdate));

    // await broadcastDelegateStackStx({
    //   amountUstx: 11_000_000_000,
    //   stacker: Accounts.WALLET_4,
    //   user: Accounts.DEPLOYER,
    //   nonce: 3,
    //   network,
    // });
    // chainUpdate = await orchestrator.waitForNextStacksBlock();
    // console.log(
    //   "** " +
    //     (chainUpdate.new_blocks[0].block.metadata as StacksBlockMetadata)
    //       .bitcoin_anchor_block_identifier.index
    // );
    // console.log(JSON.stringify(chainUpdate));
  });

  it("whole flow 5 stackers", async () => {
    const network = new StacksTestnet({ url: orchestrator.getStacksNodeUrl() });

    let usersList = [
      Accounts.WALLET_8,
      Accounts.WALLET_1,
      Accounts.WALLET_2,
      Accounts.WALLET_3,
    ];
    await orchestrator.waitForNextStacksBlock();
    await orchestrator.waitForNextStacksBlock();
    await orchestrator.waitForNextStacksBlock();

    await broadcastDepositStxOwner({
      amountUstx: 10_000_000_000,
      nonce: (await getAccount(network, Accounts.DEPLOYER.stxAddress)).nonce,
      network,
      user: Accounts.DEPLOYER,
    });
    let chainUpdate = await orchestrator.waitForNextStacksBlock();
    let metadata = chainUpdate.new_blocks[0].block.transactions[1].metadata;
    expect((metadata as any)["success"]).toBe(true);
    expect((metadata as any)["result"]).toBe("(ok true)");

    for (let i = 0; i < 2; i++) {
      console.log(i);
      await broadcastAllowContractCallerContracCall({
        network,
        nonce: (await getAccount(network, usersList[i].stxAddress)).nonce,
        senderKey: usersList[i].secretKey,
      });
    }

    chainUpdate = await orchestrator.waitForNextStacksBlock();
    for (let i = 0; i < 2; i++) {
      console.log(
        `transaction ${i}:`,
        chainUpdate.new_blocks[0].block.transactions[1]
      );
      metadata = chainUpdate.new_blocks[0].block.transactions[1].metadata;
      expect((metadata as any)["success"]).toBe(true);
      expect((metadata as any)["result"]).toBe("(ok true)");
    }

    for (let i = 2; i < 4; i++) {
      console.log(i);
      await broadcastAllowContractCallerContracCall({
        network,
        nonce: (await getAccount(network, usersList[i].stxAddress)).nonce,
        senderKey: usersList[i].secretKey,
      });
    }

    chainUpdate = await orchestrator.waitForNextStacksBlock();
    for (let i = 1; i <= 2; i++) {
      console.log(
        `transaction ${i}:`,
        chainUpdate.new_blocks[0].block.transactions[1]
      );
      metadata = chainUpdate.new_blocks[0].block.transactions[i].metadata;
      expect((metadata as any)["success"]).toBe(true);
      expect((metadata as any)["result"]).toBe("(ok true)");
    }

    for (let i = 0; i < usersList.length; i++) {
      await broadcastJoinPool({
        nonce: (await getAccount(network, usersList[i].stxAddress)).nonce,
        network,
        user: usersList[i],
      });
    }
    chainUpdate = await orchestrator.waitForNextStacksBlock();

    for (let i = 1; i <= usersList.length; i++) {
      metadata = chainUpdate.new_blocks[0].block.transactions[i].metadata;
      expect((metadata as any)["success"]).toBe(true);
      expect((metadata as any)["result"]).toBe("(ok true)");
    }

    for (let i = 0; i < usersList.length; i++) {
      await broadcastDelegateStx({
        amountUstx: 125_000_000_000,
        user: usersList[i],
        nonce: (await getAccount(network, usersList[i].stxAddress)).nonce,
        network,
      });
    }

    chainUpdate = await orchestrator.waitForNextStacksBlock();
    for (let i = 1; i <= usersList.length; i++) {
      metadata = chainUpdate.new_blocks[0].block.transactions[i].metadata;
      expect((metadata as any)["success"]).toBe(true);
      expect((metadata as any)["result"]).toBe("(ok true)");
    }
  });
});
