
;; Main Stacking Pool Contract


;; Flow
;; 1. The liquidity provider deploys the contract 
;; 2. He locks into the SC a sum which will be sufficient to cover all the stackers' rewards
;; 3. Stackers who want to stack through the stacking pool have to join the pool.
;; 4. They will have to delegate the STX they want to stack to the pool's POX address
;; 5. When the total amount commited is enough to be stacked, it will be auto committed
;; 6. The stackers will be able to claim the rewards after they are distributed

;; + In prepare phase, calculate weight of the stackers inside the pool (Notion)

;; Default length of the PoX registration window, in burnchain blocks.
(define-constant PREPARE_CYCLE_LENGTH u100)

;; Default length of the PoX reward cycle, in burnchain blocks.
(define-constant REWARD_CYCLE_LENGTH u2100)

(define-constant err-only-liquidity-provider (err u100))
(define-constant err-already-in-pool (err u101))
(define-constant err-not-in-pool (err u102))
(define-constant err-allow-pool-in-pox-2-first (err u199))
(define-constant err-insufficient-funds (err u200))
(define-constant err-full-stacking-pool (err u300))
(define-constant err-decrease-forbidden (err u503))
(define-constant err-stacking-permission-denied (err u609))

(define-constant first-deposit u0)
(define-constant list-max-len u300)
(define-constant pool-contract (as-contract tx-sender))
(define-constant pox-2-contract (as-contract .pox-2-fake))
;; data vars
;;
(define-data-var sc-total-balance uint u0)
(define-data-var sc-delegated-balance uint u0)
(define-data-var sc-owned-balance uint u0)
(define-data-var sc-locked-balance uint u0)
(define-data-var stackers-list (list 300 principal) (list tx-sender))
(define-data-var liquidity-provider principal tx-sender)

(define-data-var pool-pox-address {hashbytes: (buff 32), version: (buff 1)}
  {
    version: 0x04,
    hashbytes: 0x83ed66860315e334010bbfb76eb3eef887efee0a})

(define-data-var stx-buffer uint u1000000) ;; 1 STX

;; data maps
;;

(define-map user-data { address: principal } {is-in-pool:bool, delegated-balance: uint, locked-balance:uint, until-block-ht:uint })
;; when locking STX, increment locked-balance with min (delegated, STX funds -> STX)
;; (define-map map-delegated-balance principal uint)

(define-map pox-addr-indices uint uint)

(define-map last-aggregation uint uint)

(define-map allowance-contract-callers
  { sender: principal, contract-caller: principal}
  { until-burn-ht: (optional uint)})

(map-set user-data {address: tx-sender} {is-in-pool:true, delegated-balance:u0, locked-balance:u0, until-block-ht:u0 })
(allow-contract-caller (as-contract tx-sender) none)
;; public functions
;;
(define-public (deposit-stx-SC-owner (amount uint)) 
(begin 
  (asserts! (is-eq tx-sender (var-get liquidity-provider)) err-only-liquidity-provider)
  (try! (as-contract (stx-transfer? amount tx-sender (var-get liquidity-provider))))
  (var-set sc-total-balance (+ amount (var-get sc-total-balance)))
  (var-set sc-owned-balance (+ amount (var-get sc-owned-balance)))
  (ok true)))

(define-public (join-stacking-pool)
(begin
  (asserts! (check-pool-SC-pox-2-allowance) err-allow-pool-in-pox-2-first)
  (asserts! (is-none (map-get? user-data {address: tx-sender})) err-already-in-pool)
  (try! (allow-contract-caller (as-contract tx-sender) none))
  (var-set stackers-list (unwrap! (as-max-len? (concat (var-get stackers-list) (list tx-sender )) u300) err-full-stacking-pool)) 
  (map-set user-data {address: tx-sender} {is-in-pool:true, delegated-balance: u0, locked-balance: u0, until-block-ht: u0})
  (ok true)))

(define-public (quit-stacking-pool)
(begin
  (asserts! (is-some (map-get? user-data {address: tx-sender})) err-not-in-pool)
  (try! (disallow-contract-caller pool-contract))
  (var-set stackers-list (filter remove-stacker-stackers-list (var-get stackers-list))) 
  (map-delete user-data {address: tx-sender})
  (ok true)))

(define-public (filter-check) 
(ok (filter remove-stacker-stackers-list (var-get stackers-list))))

(define-private (remove-stacker-stackers-list (address principal)) (not (is-eq tx-sender address)))

(define-public (lock-funds-future-rewards (amount uint)) 
(begin 
  (asserts! (is-eq tx-sender (var-get liquidity-provider)) err-only-liquidity-provider)
  (asserts! (>= (var-get sc-owned-balance) amount) err-insufficient-funds) 
  (var-set sc-owned-balance (- (var-get sc-owned-balance) amount))
  (var-set sc-locked-balance (+ (var-get sc-locked-balance) amount))
  (ok true)))

(define-public (allow-contract-caller (caller principal) (until-burn-ht (optional uint)))
  (begin
    (asserts! (is-eq tx-sender contract-caller) err-stacking-permission-denied)
    (ok (map-set allowance-contract-callers
          { sender: tx-sender, contract-caller: caller}
          { until-burn-ht: until-burn-ht}))))

;; Revoke contract-caller authorization to call stacking methods
(define-public (disallow-contract-caller (caller principal))
  (begin
    (asserts! (is-eq tx-sender contract-caller) err-stacking-permission-denied)
    (ok (map-delete allowance-contract-callers { sender: tx-sender, contract-caller: caller}))))


(define-public (delegate-stx (amount-ustx uint))
  (let ((user tx-sender)
        (current-cycle (contract-call? .pox-2-fake current-pox-reward-cycle)))
        (print (contract-call? .pox-2-fake current-pox-reward-cycle)) ;; u0
    (asserts! (check-caller-allowed) err-stacking-permission-denied)
    (asserts! (check-pool-SC-pox-2-allowance) err-allow-pool-in-pox-2-first)
    
    (asserts! (is-in-pool) err-not-in-pool)
    ;; Do 1. and 2.
    (try! (delegate-stx-inner amount-ustx (as-contract tx-sender) none))
    ;; Do 3.
    (try! (as-contract (lock-delegated-stx user)))
    ;; Do 4.
    (ok (maybe-stack-aggregation-commit current-cycle))))

;; read only functions
;;
(define-read-only (print-stx-account)
(stx-account tx-sender))

(define-read-only (get-pool-members) 
(var-get stackers-list))

(define-read-only (check-caller-allowed)
  (or (is-eq tx-sender contract-caller)
    (let ((caller-allowed
            ;; if not in the caller map, return false
            (unwrap! 
              (map-get? allowance-contract-callers
                { sender: tx-sender, contract-caller: contract-caller})
            false))
          (expires-at
            ;; if until-burn-ht not set, then return true (because no expiry)
            (unwrap! (get until-burn-ht caller-allowed) true)))
      ;; is the caller allowance still valid
      (< burn-block-height expires-at))))

(define-private (is-in-pool) 
(unwrap! (get is-in-pool (map-get? user-data {address: tx-sender})) false))

(define-read-only (get-SC-total-balance) 
(var-get sc-total-balance))

(define-read-only (get-SC-locked-balance)
(var-get sc-locked-balance))

;; private functions
;; 

(define-read-only (check-pool-SC-pox-2-allowance)
  (is-some (contract-call? .pox-2-fake get-allowance-contract-callers tx-sender pool-contract)))

(define-private (maybe-stack-aggregation-commit (current-cycle uint))
  (let ((reward-cycle (+ u1 current-cycle)))
    (match (map-get? pox-addr-indices reward-cycle)
            ;; Total stacked already reached minimum.
            ;; Call stack-aggregate-increase.
            ;; It might fail because called in the same cycle twice.
      index (match (as-contract (contract-call? 'SP000000000000000000002Q6VF78.pox-2 stack-aggregation-increase (var-get pool-pox-address) reward-cycle index))
              success (map-set last-aggregation reward-cycle block-height)
              error (begin (print {err-increase-ignored: error}) false))
            ;; Total stacked is still below minimum.
            ;; Just try to commit, it might fail because minimum not yet met
      (match (as-contract (contract-call? 'SP000000000000000000002Q6VF78.pox-2 stack-aggregation-commit-indexed (var-get pool-pox-address) reward-cycle))
        index (begin
                (map-set pox-addr-indices reward-cycle index)
                (map-set last-aggregation reward-cycle block-height))
        error (begin (print {err-commit-ignored: error}) false))))) ;; ignore errors

;; TODO: remove these 3 fns, they are public helpers
(define-public (get-pox-addr-indices) 
(ok (map-get? pox-addr-indices u1)))

(define-public (call-stack-aggregation-commit-indexed) 
(ok (as-contract (contract-call? .pox-2-fake stack-aggregation-commit-indexed (var-get pool-pox-address) u1))))

(define-public (try-stack-delegation (user principal)) 
(let ((start-burn-ht (+ burn-block-height u1))
        (pox-address (var-get pool-pox-address))
        ;; delegate the minimum of the delegated amount and stx balance (including locked stx)
        (buffer-amount (var-get stx-buffer))
        (user-account (stx-account user))
        (allowed-amount (min (get-delegated-amount user) (+ (get locked user-account) (get unlocked user-account))))
        (amount-ustx (if (> allowed-amount buffer-amount) (- allowed-amount buffer-amount) allowed-amount)))
    ;; add this too TODO:
    ;; (asserts! (var-get active) err-pox-address-deactivated)
    (ok (contract-call? .pox-2-fake delegate-stack-stx
             user amount-ustx
             pox-address start-burn-ht u1))))

(define-private (delegate-stx-inner (amount-ustx uint) (delegate-to principal) (until-burn-ht (optional uint)))
  (let ((result-revoke
          ;; Calls revoke and ignores result
          (contract-call? .pox-2-fake revoke-delegate-stx)))
    ;; Calls delegate-stx, converts any error to uint
    (match (contract-call? 'SP000000000000000000002Q6VF78.pox-2 delegate-stx amount-ustx delegate-to until-burn-ht none)
      success (ok success)
      error (err (* u1000 (to-uint error))))))

(define-private (lock-delegated-stx (user principal))
  (let ((start-burn-ht (+ burn-block-height u1))
        (pox-address (var-get pool-pox-address))
        ;; delegate the minimum of the delegated amount and stx balance (including locked stx)
        (buffer-amount (var-get stx-buffer))
        (user-account (stx-account user))
        (allowed-amount (min (get-delegated-amount user) (+ (get locked user-account) (get unlocked user-account))))
        (amount-ustx (if (> allowed-amount buffer-amount) (- allowed-amount buffer-amount) allowed-amount)))
        (print allowed-amount)
    ;; add this too TODO:
    ;; (asserts! (var-get active) err-pox-address-deactivated)
    (match (contract-call? 'SP000000000000000000002Q6VF78.pox-2 delegate-stack-stx
             user amount-ustx
             pox-address start-burn-ht u1)
      stacker-details  (ok stacker-details)
      error (if (is-eq error 3) ;; check whether user is already stacked
              (delegate-stack-extend-increase user amount-ustx pox-address start-burn-ht)
              (err (* u1000 (to-uint error)))))))

(define-private (delegate-stack-extend-increase (user principal)
                  (amount-ustx uint)
                  (pox-address {hashbytes: (buff 32), version: (buff 1)})
                  (start-burn-ht uint))
  (let ((status (stx-account user)))
    (asserts! (>= amount-ustx (get locked status)) err-decrease-forbidden)
    (match (contract-call? 'SP000000000000000000002Q6VF78.pox-2 delegate-stack-extend
             user pox-address u1)
      success (if (> amount-ustx (get locked status))
                (match (contract-call? 'SP000000000000000000002Q6VF78.pox-2 delegate-stack-increase
                         user pox-address (- amount-ustx (get locked status)))
                  success-increase (ok {lock-amount: (get total-locked success-increase),
                                        stacker: user,
                                        unlock-burn-height: (get unlock-burn-height success)})
                  error-increase (err (* u1000000000 (to-uint error-increase))))
                (ok {lock-amount: (get locked status),
                     stacker: user,
                     unlock-burn-height: (get unlock-burn-height success)}))
      error (err (* u1000000 (to-uint error))))))

(define-read-only (get-delegated-amount (user principal))
  (default-to u0 (get amount-ustx (contract-call? .pox-2-fake get-delegation-info user))))

(define-private (min (amount-1 uint) (amount-2 uint))
  (if (< amount-1 amount-2)
    amount-1
    amount-2))