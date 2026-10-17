# Phase 7 — advanced bulk operations

## Merchant workflow

Open MPS → Products → Import. Download template v9, fill the Products, Variants
and/or Bulk Actions sheets, then preview before applying. Empty Products rows
are allowed when only Bulk Actions are needed; leave its standard headers intact.
Only explicitly identified handles/SKUs and populated fields are changed.

Bulk Actions columns: `Target Type`, `Identifier`, `Action`, `Value`, `Field`,
`Find`, `Replace`. PRODUCT identifiers are handles; VARIANT identifiers are SKUs.

| Action | Example value | Result |
| --- | --- | --- |
| PRICE_PERCENT | -10 | Reduce current price by 10% |
| PRICE_DELTA | 50 / -50 | Add/subtract a fixed amount |
| PRICE_SET | 999 | Set an absolute price |
| STOCK_DELTA | 20 / -5 | Add/deduct units; never below reserved stock |
| SET_STATUS | active / draft | Publish/unpublish product; activate/deactivate variant |
| SET_BRAND / SET_CATEGORY | Brand/category text | Assign product attribute |
| SET_TAGS | oud, evening | Replace product tags |
| ADD_TAGS / REMOVE_TAGS | oud, evening | Add/remove specified product tags |
| ADD_COLLECTION / REMOVE_COLLECTION | collection-handle | Change manual collection membership |
| FIND_REPLACE | leave Value blank | Use Field, Find, Replace columns |

Find/replace is literal and case-sensitive, preserves whitespace, and permits an
empty replacement. Supported fields: Title, Description, Brand, Category, SEO
Title, SEO Description, Short Description. Identity fields are not editable.
Assignments, tags, collections and find/replace are product-only actions.
Duplicate operations on a target field, including conflicts across sheets, fail
preview. NaN/infinite/negative/overflowing prices are rejected.

## Saved mappings

Expand **Advanced operations, mappings & history**, load mappings, and create
a named mapping from supplier column headers to canonical fields. Select it
before previewing the file. Mappings apply to the Products sheet (or CSV) only;
Variants, Images and Bulk Actions continue using standard headers.

The same name updates an owner's mapping. Each job stores a copy so subsequent
mapping edits cannot alter an approved preview. Missing mapped columns and
duplicate destinations fail validation. Mappings/history are owner-scoped and
require an authorized catalog staff role.

## Scheduled prices and sales

Prepare a price-only workbook (price and/or compare-at price, products/variants).
Preview it, then choose **Schedule prices / sale window**. Dates are entered in
the browser's timezone and sent as timezone-aware ISO dates. An optional end
date restores pre-sale values using the import snapshot. To show a comparison
price during the sale, include Compare At Price explicitly in the workbook.

Celery Beat emits `apps.shop.tasks.run_scheduled_imports` every 30 seconds to
the `imports` queue. Both Beat and an imports worker must run. This is periodic
execution, not a guarantee of exact-to-the-second price changes. Each tick handles
up to 50 starts and 50 endings, with transactional job and catalog row locks.

States: pending → active → ended (sale), pending → completed (one-time price
change), pending → cancelled, or review on a stale-price/permission conflict.
An entirely missed sale window becomes expired and is not applied late.
Duplicate ticks cannot apply an adjustment twice. Scheduled prices use the
approved preview values, not recalculated percentages on newer prices.

Pending schedules can be cancelled from history. A cancelled/review job needs
a new preview before scheduling or applying again. To stop an active sale early,
use undo. Removed catalog permissions/inactive owners prevent scheduled starts.
Scheduled endings preserve later edits and enter review instead of overwriting.

## Undo and recovery limits

Applied update-only imports capture a field-level before/after snapshot in the
same transaction as their updates. Use **Undo from snapshot** or recent history.
Undo validates current values against the import's after-values; any mismatch
or stock reservation conflict aborts the entire undo. Unrelated fields are left
unchanged. Stock undo writes compensating inventory movements; repeated undo is
idempotent. A separate reversal job identifies the operator and original job.

Automatic undo deliberately excludes whole imports containing product creation,
variant add/delete, or image operations. It does not delete products referenced
by orders or attempt to restore files that storage may have removed. Those need
manual recovery/backups. Older imports without snapshots cannot be undone.

## Deployment

Migration: `shop.0020_import_schedules_snapshots_mappings` (additive only).
Deploy backend/MPS source or rebuild their images, apply migrations, then restart
the imports worker and Beat to register the new task and schedule. Back up the
database first according to your normal deployment procedure.

For the existing nested Compose development deployment:

```powershell
docker compose -f perfumebooth/docker-compose.yml -f perfumebooth/docker-compose.dev.yml exec -T django python manage.py migrate
docker compose -f perfumebooth/docker-compose.yml -f perfumebooth/docker-compose.dev.yml up -d --no-deps celery_imports celery_beat
```

These commands assume Django already runs current source. For image-based
deployment rebuild Django, the imports worker, Beat and MPS first. Do not change
deployment modes simply to run these example commands. A plain container restart
does not update baked-in source code.

## Verification

Run `manage.py test apps.shop.tests.test_advanced_imports
apps.shop.tests.test_selective_product_import --noinput` with `USE_R2=False`
for the test process. Set `TEST_POSTGRES=True` to include row-lock concurrency
tests against a separate test database. The SQLite run skips those two tests.
TypeScript and scoped ESLint validate the MPS controls. Browser UI tests use
mock responses to avoid changing the live catalog; test real import → schedule
→ sale end with a disposable product after deployment.
