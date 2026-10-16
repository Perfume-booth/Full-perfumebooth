# Phase 6 — Payments and idempotency

## Architecture and guarantees

Django owns checkout totals, Razorpay order creation, verification and durable payment state. Next.js is a same-origin proxy; secrets belong in the backend environment. Public initialization and COD checkout require a random UUID `Idempotency-Key`. Reuse it for retries of the same cart/address/payment method; a changed payload returns 409. Keys are retained, not expired after a short cache TTL.

`CheckoutRequest` serializes concurrent creation and stores the original result. `PaymentAttempt` binds a single Razorpay order to an internal order. `PaymentEvent` records verified outcomes. A captured payment is accepted only against that binding, the exact amount/currency, and an open order with active, unexpired reservations. A failed attempt does not cancel an order; stock expiration is serialized against captures. Late/second captures are recorded as `review`, without changing order state or dispatching fulfillment.

`PaymentOutbox` is created in the same transaction as confirmation. Beat dispatches committed rows every 15 seconds; duplicate callbacks do not create additional effects. Broker outages cannot lose the durable work. A worker interruption or ambiguous external send goes to `review` rather than risking a duplicate email/shipment. Exactly-once external SMTP delivery cannot be guaranteed by a database transaction. Operators must confirm provider state before retrying an uncertain delivery.

The storefront persists a pending payment proof in session storage. Repeating Complete Purchase verifies that proof rather than initiating another payment. Success requires a captured payment confirmed in the database. Authorized-only payments remain pending. Provider capture must be configured in Razorpay; this integration does not force-capture payments.

## Deployment

From `D:\Full-Perfumebooth`, using the nested development Compose configuration:

```powershell
docker compose -f perfumebooth/docker-compose.yml -f perfumebooth/docker-compose.dev.yml exec -T django python manage.py migrate orders --noinput
docker compose -f perfumebooth/docker-compose.yml -f perfumebooth/docker-compose.dev.yml up -d --no-deps django celery_default celery_beat
```

Workers must load the new source; restarting an old image without the development source mounts is insufficient. Production deployments must rebuild backend/worker and storefront images. Do not run two Beat schedulers. The outbox worker invokes receipt/shipping code directly on the default queue.

Configure `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` in Django. The storefront uses `DJANGO_API_URL`, then `BACKEND_API_URL`, then `http://django:8000` inside Docker or `http://localhost:8000` outside Docker. Never expose the key secret through `NEXT_PUBLIC_*` variables.

Subscribe Razorpay to `payment.captured`, `payment.failed`, and optionally `payment.authorized`, targeting `/api/v1/checkout/webhooks/razorpay/` over HTTPS. Empty webhook secrets fail closed. Next.js callback verification also fetches the actual provider payment before changing state.

## Recovery and operations

Read-only payment lists are available in Django admin (attempts, events and outbox). Review these routinely and alert on `review`/`unknown` states. Reconciliation runs every minute for recent unresolved attempts (7-day window); older attempts can be reconciled explicitly. It searches by receipt after ambiguous initialization and never automatically creates another provider order.

Run the following inside the Django container:

```text
python manage.py payment_recovery
python manage.py payment_recovery --attempt 123
python manage.py payment_recovery --attempt 123 --gateway-order order_EXISTING
python manage.py payment_recovery --outbox 456
```

After independently confirming external delivery, mark a review row done:

```text
python manage.py payment_recovery --outbox 456 --resolution delivered --confirmed-provider-state
```

Only after confirming the email/shipment was NOT delivered, retry it:

```text
python manage.py payment_recovery --outbox 456 --resolution retry --confirmed-provider-state
```

Legacy prepaid orders have no saved provider binding. Find the exact Razorpay order in the provider dashboard and bind/reconcile it with `payment_recovery --order INTERNAL_UUID --gateway-order order_EXISTING`. Receipt, amount and currency are validated; no order is guessed from webhook notes. Late captures on cancelled/expired orders require an operator decision/refund in Razorpay, not automatic fulfillment. Refund execution/accounting is not added by this phase.

If initialization has no matching provider order after a timeout, inspect Razorpay before allowing a new checkout. Never reset an unknown attempt to `new` blindly. Pending browser proofs are retained to prevent duplicate payments; support review is required for unrecoverable proofs or reviewed captures. Existing pending checkouts should be drained/reconciled when deploying this change.

## Verification

```powershell
docker compose -f perfumebooth/docker-compose.yml -f perfumebooth/docker-compose.dev.yml exec -T -e TEST_POSTGRES=1 django python manage.py test apps.checkout.tests apps.orders.tests apps.inventory.tests --verbosity 1
```

Use PostgreSQL for concurrency tests; the default SQLite suite skips row-lock concurrency tests. Tests mock all gateway calls. Complete a Razorpay **test-mode** checkout, webhook redelivery and delayed-capture check before enabling live payments. Also validate real SMTP and Shiprocket delivery independently; tests do not send real mail or create shipments.

Implementation validation (2026-10-13): 57 tests passed on PostgreSQL, including concurrent checkout and capture requests; TypeScript and proxy-route lint checks passed. Migration 0006 was applied locally and the default worker/Beat were recreated with source mounts. Browser smoke reached `http://localhost:3000/checkout` with the edited bundle, but the isolated mocked payment interaction could not proceed: checkout continued showing an empty cart despite seeded persisted cart data. No end-to-end payment UI pass is claimed. Resolve/retest the cart hydration/test setup and then run provider test-mode validation before live rollout.

Provider references: [checkout verification](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/), [receipt lookup](https://razorpay.com/docs/api/orders/fetch-all/), [webhook duplicates and ordering](https://github.com/razorpay/markdown-docs/blob/master/webhooks/best-practices.md).
