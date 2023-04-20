
;; Main Stacking Pool Contract

;; traits
;;

;; token definitions
;; 

;; constants
;;
(define-constant err-only-liquidity-provider (err u100))
(define-constant err-insufficient-funds (err u200))
(define-constant first-deposit u100)

;; data vars
;;
(define-data-var sc-total-balance uint u0)
(define-data-var sc-delegated-balance uint u0)
(define-data-var sc-owned-balance uint u0)
(define-data-var sc-locked-balance uint u0)
(define-data-var stackers-list (list 100 principal) (list tx-sender))
(define-data-var liquidity-provider principal tx-sender)

;; data maps
;;
(define-map map-delegated-balance principal uint)

;; public functions
;;
(define-public (ask-to-join-pool (stacker principal))
(begin 
  (concat (var-get stackers-list) (list stacker ))
  (map-set map-delegated-balance stacker u0)
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

;; (define-public (delegate-stx) body)

;; read only functions
;;
(define-read-only (get-SC-total-balance) 
(var-get sc-total-balance))

(define-read-only (get-SC-locked-balance)
(var-get sc-locked-balance))

;; private functions
;; 

