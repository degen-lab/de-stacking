import { Chain, Tx, types, Account } from "../deps.ts";

export function allowContractCaller(
  contractCaller: string,
  untilBurnHt: number | undefined,
  user: Account
) {
  return Tx.contractCall(
    "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.pox-2-fake",
    "allow-contract-caller",
    [
      types.principal(contractCaller),
      untilBurnHt ? types.some(types.uint(untilBurnHt)) : types.none(),
    ],
    user.address
  );
}

export function disallowContractCaller(contractCaller: string, user: Account) {
  return Tx.contractCall(
    "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.pox-2-fake",
    "disallow-contract-caller",
    [types.principal(contractCaller)],
    user.address
  );
}

export function delegateStx(amount: number, delegateTo: string, user: Account) {
  return Tx.contractCall(
    "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.pox-2-fake",
    "delegate-stx",
    [
      types.uint(amount),
      types.principal(delegateTo),
      types.none(),
      types.none(),
    ],
    user.address
  );
}

export function stackAggregationCommitIndexed(
  poxAddr: { version: string; hashbytes: string },
  cycle: number,
  poolOperator: Account
) {
  return Tx.contractCall(
    "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.pox-2-fake",
    "stack-aggregation-commit-indexed",
    [types.tuple(poxAddr), types.uint(cycle)],
    poolOperator.address
  );
}

export function stackAggregationIncrease(
  poxAddr: { version: string; hashbytes: string },
  cycle: number,
  poxAddrIndex: number,
  poolOperator: Account
) {
  return Tx.contractCall(
    "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.pox-2-fake",
    "stack-aggregation-increase",
    [types.tuple(poxAddr), types.uint(cycle), types.uint(poxAddrIndex)],
    poolOperator.address
  );
}

export function revokeDelegateStx(user: Account) {
  return Tx.contractCall(
    "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.pox-2-fake",
    "revoke-delegate-stx",
    [],
    user.address
  );
}

export function getPartialStackedByCycle(
  poolPoxAddr: { version: string; hashbytes: string },
  cycle: number,
  poolAddress: string,
  chain: Chain,
  user: Account
) {
  return chain.callReadOnlyFn(
    "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.pox-2-fake",
    "get-partial-stacked-by-cycle",
    [types.tuple(poolPoxAddr), types.uint(cycle), types.principal(poolAddress)],
    user.address
  );
}

export function getRewardSetPoxAddress(
  cycle: number,
  index: number,
  chain: Chain,
  user: Account
) {
  return chain.callReadOnlyFn(
    "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.pox-2-fake",
    "get-reward-set-pox-address",
    [types.uint(cycle), types.uint(index)],
    user.address
  );
}

export function getPoxInfo(chain: Chain, user: Account) {
  return chain.callReadOnlyFn(
    "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.pox-2-fake",
    "get-pox-info",
    [],
    user.address
  );
}

// export function getStackerInfo(chain: Chain, user: Account, stacker: Account) {
//   return chain.contractCall(
//     "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.pox-2-fake",
//     "get-stacker-info",
//     [types.principal(stacker)],
//     user.address
//   );
// }
