
;; Main Stacking Pool Contract


;; Flow
;; 1. The liquidity provider deploys the contract 
;; 2. He locks into the SC a sum which will be sufficient to cover all the stackers' rewards
;; 3. Stackers who want to stack through the stacking pool have to join the pool.
;; 4. They will have to delegate the STX they want to stack to the pool's POX address
;; 5. When the total amount commited is enough to be stacked, it will be auto committed
;; 6. The stackers will be able to claim the rewards after they are distributed

;; Default length of the PoX registration window, in burnchain blocks.
(define-constant PREPARE_CYCLE_LENGTH u100)

;; Default length of the PoX reward cycle, in burnchain blocks.
(define-constant REWARD_CYCLE_LENGTH u2100)

(define-constant err-only-liquidity-provider (err u100))
(define-constant err-insufficient-funds (err u200))
(define-constant err-decrease-forbidden (err u503))

(define-constant first-deposit u0)

;; data vars
;;
(define-data-var sc-total-balance uint u0)
(define-data-var sc-delegated-balance uint u0)
(define-data-var sc-owned-balance uint u0)
(define-data-var sc-locked-balance uint u0)
(define-data-var stackers-list (list 100 principal) (list tx-sender))
(define-data-var liquidity-provider principal tx-sender)

(define-data-var pool-pox-address {hashbytes: (buff 32), version: (buff 1)}
  {
    version: 0x04,
    hashbytes: 0x83ed66860315e334010bbfb76eb3eef887efee0a})

(define-data-var stx-buffer uint u1000000) ;; 1 STX

;; data maps
;;

(define-map user-data { address: principal } { delegated-balance: uint, locked-balance:uint, until-block-ht:uint })
;; (define-map map-delegated-balance principal uint)

(define-map pox-addr-indices uint uint)

(define-map last-aggregation uint uint)

;; public functions
;;
(define-public (ask-to-join-pool (stacker principal))
(begin 
  (concat (var-get stackers-list) (list stacker ))
  (map-set user-data {address: stacker} {delegated-balance: u0, locked-balance: u0, until-block-ht: u0})
  (ok true)))

(define-public (deposit-stx-SC-owner (amount uint)) 
(begin 
  (asserts! (is-eq tx-sender (var-get liquidity-provider)) err-only-liquidity-provider)
  (try! (as-contract (stx-transfer? amount tx-sender (var-get liquidity-provider))))
  (var-set sc-total-balance (+ amount (var-get sc-total-balance)))
  (var-set sc-owned-balance (+ amount (var-get sc-owned-balance)))
  (ok true)))

(define-public (lock-funds-future-rewards (amount uint)) 
(begin 
  (asserts! (is-eq tx-sender (var-get liquidity-provider)) err-only-liquidity-provider)
  (asserts! (>= (var-get sc-owned-balance) amount) err-insufficient-funds) 
  (var-set sc-owned-balance (- (var-get sc-owned-balance) amount))
  (var-set sc-locked-balance (+ (var-get sc-locked-balance) amount))
  (ok true)))

;; (define-public (delegate-stx (amount-ustx uint))
;;   (let ((user tx-sender)
;;         (current-cycle (contract-call? 'SP000000000000000000002Q6VF78.pox-2 current-pox-reward-cycle)))
;;     (asserts! (check-caller-allowed) err-stacking-permission-denied)
;;     ;; Do 1. and 2.
;;     (try! (delegate-stx-inner amount-ustx (as-contract tx-sender) none))
;;     ;; Do 3.
;;     (try! (as-contract (lock-delegated-stx user)))
;;     ;; Do 4.
;;     (ok (maybe-stack-aggregation-commit current-cycle))))

;; (define-public (delegate-stx (amount-ustx uint) 
;;                              (delegate-to principal) 
;;                              (until-burn-ht (optional uint))
;;                              (pox-addr (optional { version: (buff 1),
;;                                                    hashbytes: (buff 32) })))
;; (contract-call? .pox-2-fake delegate-stx amount-ustx (var-get liquidity-provider) until-burn-ht pox-addr))

(define-public (print-stx-account)
  (ok (print (stx-account tx-sender))))
;; read only functions
;;
(define-read-only (get-SC-total-balance) 
(var-get sc-total-balance))

(define-read-only (get-SC-locked-balance)
(var-get sc-locked-balance))

;; private functions
;; 

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

(define-private (delegate-stx-inner (amount-ustx uint) (delegate-to principal) (until-burn-ht (optional uint)))
  (let ((result-revoke
            ;; Calls revoke and ignores result
          (contract-call? 'SP000000000000000000002Q6VF78.pox-2 revoke-delegate-stx)))
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