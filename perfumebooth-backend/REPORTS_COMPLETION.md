# Report completion checkpoint

## Implemented in this pass

- Additive `orders.0010_paymenttransaction` migration: verified captures and individual processed refunds, protected order reference, positive-amount constraint, provider-reference uniqueness and timestamp provenance.
- Captures recorded in the existing atomic payment handler, including money received on orders requiring operator review. Repeated events do not duplicate collections.
- Signed `refund.processed` webhook ingestion: currency/reference validation, cumulative over-refund rejection, partial/full payment-status updates. A financial refund does not prove a physical return and does not restock inventory.
- Collections by gateway/method and individual refund reports use this ledger instead of order face values. Both use movement-time windows, not order creation dates.
- Read-only Django admin ledger inspection.
- RFM percentile scores/segments, cumulative repeat-purchase rate, and unique-order tracking coverage. Existing report hub automatically discovers the new report IDs.

## Operational requirements and limitations

- Apply migrations before deploying the updated API: `python manage.py migrate`.
- Enable `refund.processed` on the existing Razorpay webhook using the existing webhook secret and endpoint. Do not expose secrets to the storefront.
- A refund delivered before its capture is retained receives a validation failure; reconcile the capture and replay the refund. Historical capture/refund backfill is not implemented.
- Captures use first verified observation time, NOT inferred capture time. Refunds use provider event time if supplied. The report exposes timestamp provenance.
- New ledger reports do not include old unrecorded payments, COD collections, settlement fees or adjustments. Empty reports are not proof of no business activity.
- Original net sales/profit calculations still exclude partially refunded orders. True refund-adjusted net merchandise revenue and COGS reversal need item/tax/shipping refund allocation and return disposition records; do not treat these reports as a complete accounting ledger.
- Customer identity remains account ID or normalized guest email; identities are not automatically merged by unverified email. RFM uses qualifying purchases and is descriptive, not predictive.
- Tracking coverage means at least one shipped shipment has an AWB or URL. It is not a verification of carrier delivery or every package in a split shipment.

## Remaining work (not complete)

1. Historical payment reconciliation/backfill, verified COD receipts, settlement reconciliation and fees.
2. Refund allocations, return-item quantities/reasons/disposition, corresponding net sales and profit calculations.
3. Shipping-label cost ingestion and full split-shipment coverage.
4. Inventory receipts/opening balances, scheduled historical quantity/cost snapshots, sell-through and month-end valuation.
5. Consent-aware analytics collection or GA4 connection; session identity, event retention, acquisition and search attribution.
6. Campaign attribution plus selected ad-platform spend integration for ROAS.
7. Real-user LCP/INP/CLS collection by URL/page type/time (not synthetic lab metrics).
8. Verified dispute/risk-decision ingestion and chargeback/fraud reports.
9. Live source-to-report acceptance testing and reconciliation against provider totals.

No unavailable report has been relabelled as complete to hide a missing source.

## Verification

- 112 targeted tests ran successfully; 2 PostgreSQL-only concurrency tests skipped by SQLite runner (110 passed).
- Model/migration drift check: no changes detected.
- Local PostgreSQL migration `orders.0010_paymenttransaction`: applied successfully.
- No live gateway transaction was created or refunded. Live webhook delivery and external reconciliation have not been verified.
