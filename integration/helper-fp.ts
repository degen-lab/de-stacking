import {
  AnchorMode,
  bufferCV,
  ClarityValue,
  listCV,
  noneCV,
  PostConditionMode,
  principalCV,
  standardPrincipalCV,
  tupleCV,
  uintCV,
} from "@stacks/transactions";
import { StacksNetwork } from "@stacks/network";
import { Accounts } from "./constants";
import {
  HelperContract,
  mainContract,
  poxPoolsSelfServiceContract,
} from "./contracts";
import { decodeBtcAddress } from "@stacks/stacking";
import { toBytes } from "@stacks/common";
import { handleContractCall } from "./helpers";

export async function broadcastJoinPool({
  nonce,
  network,
  user,
}: {
  nonce: number;
  network: StacksNetwork;
  user: { stxAddress: string; secretKey: string };
}) {
  let txOptions = {
    contractAddress: mainContract.address,
    contractName: mainContract.name,
    functionName: mainContract.Functions.JoinStackingPool.name,
    functionArgs: mainContract.Functions.JoinStackingPool.args({}),
    nonce,
    network,
    anchorMode: AnchorMode.OnChainOnly,
    postConditionMode: PostConditionMode.Allow,
    senderKey: user.secretKey,
  };
  return handleContractCall({ txOptions, network });
}

export async function broadcastDelegateStx({
  amountUstx,
  nonce,
  network,
  user,
}: {
  amountUstx: number;
  nonce: number;
  network: StacksNetwork;
  user: { stxAddress: string; secretKey: string };
}) {
  let txOptions = {
    contractAddress: mainContract.address,
    contractName: mainContract.name,
    functionName: mainContract.Functions.DelegateStx.name,
    functionArgs: mainContract.Functions.DelegateStx.args({
      amountUstx: uintCV(amountUstx),
    }),
    nonce,
    network,
    anchorMode: AnchorMode.OnChainOnly,
    postConditionMode: PostConditionMode.Allow,
    senderKey: user.secretKey,
  };
  return handleContractCall({ txOptions, network });
}

export async function broadcastUpdateScBalances({
  nonce,
  network,
  user,
}: {
  nonce: number;
  network: StacksNetwork;
  user: { stxAddress: string; secretKey: string };
}) {
  let txOptions = {
    contractAddress: mainContract.address,
    contractName: mainContract.name,
    functionName: mainContract.Functions.UpdateScBalances.name,
    functionArgs: mainContract.Functions.UpdateScBalances.args({}),
    nonce,
    network,
    anchorMode: AnchorMode.OnChainOnly,
    postConditionMode: PostConditionMode.Allow,
    senderKey: user.secretKey,
  };
  return handleContractCall({ txOptions, network });
}

export async function broadcastRewardDistribution({
  burnBlockHeight,
  nonce,
  network,
  user,
}: {
  burnBlockHeight: number;
  nonce: number;
  network: StacksNetwork;
  user: { stxAddress: string; secretKey: string };
}) {
  let txOptions = {
    contractAddress: mainContract.address,
    contractName: mainContract.name,
    functionName: mainContract.Functions.RewardDistribution.name,
    functionArgs: mainContract.Functions.RewardDistribution.args({
      burnBlockHeight: uintCV(burnBlockHeight),
    }),
    nonce,
    network,
    anchorMode: AnchorMode.OnChainOnly,
    postConditionMode: PostConditionMode.Allow,
    senderKey: user.secretKey,
  };
  return handleContractCall({ txOptions, network });
}

export async function broadcastDelegateStackStx({
  stacker,
  amountUstx,
  user,
  nonce,
  network,
}: {
  stacker: { stxAddress: string; secretKey: string };
  amountUstx: number;
  user: { stxAddress: string; secretKey: string };
  nonce: number;
  network: StacksNetwork;
}) {
  let txOptions = {
    contractAddress: poxPoolsSelfServiceContract.address,
    contractName: poxPoolsSelfServiceContract.name,
    functionName: poxPoolsSelfServiceContract.Functions.DelegateStackStx.name,
    functionArgs: poxPoolsSelfServiceContract.Functions.DelegateStackStx.args({
      user: principalCV(stacker.stxAddress),
      amountUstx: uintCV(amountUstx),
    }),
    nonce,
    network,
    anchorMode: AnchorMode.OnChainOnly,
    postConditionMode: PostConditionMode.Allow,
    senderKey: user.secretKey,
  };
  return handleContractCall({ txOptions, network });
}

export async function broadcastDepositStxOwner({
  amountUstx,
  nonce,
  network,
  user,
}: {
  amountUstx: number;
  nonce: number;
  network: StacksNetwork;
  user: { stxAddress: string; secretKey: string };
}) {
  let txOptions = {
    contractAddress: mainContract.address,
    contractName: mainContract.name,
    functionName: mainContract.Functions.DepositStxOwner.name,
    functionArgs: mainContract.Functions.DepositStxOwner.args({
      amountUstx: uintCV(amountUstx),
    }),
    nonce,
    network,
    anchorMode: AnchorMode.OnChainOnly,
    postConditionMode: PostConditionMode.Allow,
    senderKey: user.secretKey,
  };
  return handleContractCall({ txOptions, network });
}

export async function broadcastReserveStxOwner({
  amountUstx,
  nonce,
  network,
  user,
}: {
  amountUstx: number;
  nonce: number;
  network: StacksNetwork;
  user: { stxAddress: string; secretKey: string };
}) {
  let txOptions = {
    contractAddress: mainContract.address,
    contractName: mainContract.name,
    functionName: mainContract.Functions.ReserveFundsLiqProvider.name,
    functionArgs: mainContract.Functions.ReserveFundsLiqProvider.args({
      amountUstx: uintCV(amountUstx),
    }),
    nonce,
    network,
    anchorMode: AnchorMode.OnChainOnly,
    postConditionMode: PostConditionMode.Allow,
    senderKey: user.secretKey,
  };
  return handleContractCall({ txOptions, network });
}
