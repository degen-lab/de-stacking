import { Chain, Tx, types, Account } from "../deps.ts";

export function fpDelegationAllowContractCaller(
  contractCaller: string,
  untilBurnHt: number | undefined,
  user: Account
) {
  return Tx.contractCall(
    "main",
    "allow-contract-caller",
    [
      types.principal(contractCaller),
      untilBurnHt ? types.some(types.uint(untilBurnHt)) : types.none(),
    ],
    user.address
  );
}

export function delegateStx(amount: number, user: Account) {
  return Tx.contractCall(
    "main",
    "delegate-stx",
    [types.uint(amount)],
    user.address
  );
}

export function delegateStackStx(stacker: Account, user: Account) {
  return Tx.contractCall(
    "main",
    "delegate-stack-stx",
    [types.principal(stacker.address)],
    user.address
  );
}

export function joinStackingPool(user: Account) {
  return Tx.contractCall("main", "join-stacking-pool", [], user.address);
}

export function delegateStackStxMany(stackers: Account[], user: Account) {
  return Tx.contractCall(
    "main",
    "delegate-stack-stx-many",
    [types.list(stackers.map((s) => types.principal(s.address)))],
    user.address
  );
}

// // admin functions

// export function setActive(active: boolean, user: Account) {
//   return Tx.contractCall(
//     "main",
//     "set-active",
//     [types.bool(active)],
//     user.address
//   );
// }

// export function setStxBuffer(amount: number, user: Account) {
//   return Tx.contractCall(
//     "main",
//     "set-stx-buffer",
//     [types.uint(amount)],
//     user.address
//   );
// }

// export function setPoolPoxAddress(
//   poxAddress: { hashbytes: string; version: string },
//   user: Account
// ) {
//   return Tx.contractCall(
//     "main",
//     "set-pool-pox-address",
//     [types.tuple(poxAddress)],
//     user.address
//   );
// }

// export function setRewardAdmin(
//   newAdmin: string,
//   enable: boolean,
//   user: Account
// ) {
//   return Tx.contractCall(
//     "main",
//     "set-reward-admin",
//     [types.principal(newAdmin), types.bool(enable)],
//     user.address
//   );
// }
