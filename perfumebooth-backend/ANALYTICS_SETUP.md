# Analytics: implementation and activation

## Source boundaries

Django orders, payments, refunds, returns and inventory remain authoritative.
Browser events cannot create purchases or financial records. The consent-session
token is signed by Django and can only attach attribution to a server-created
checkout order. Checkout idempotency ignores the optional token; attribution
storage failures do not fail commerce transactions.

The existing Reports page includes first-party session/search/conversion and
Web Vitals reports, provider-specific GA4/Search Console/Google Ads/Meta Ads
reports, source readiness and an observed, consent-attributed campaign ROAS report.
These are not interchangeable totals. Read each report's definitions.

## Activation (not completed automatically)

1. Apply `python manage.py migrate` before deployment. Local analytics migrations
   could not be applied by the assistant because the approval service hit its
   usage limit. SQLite test migrations succeeded; production/local Postgres
   migrations `analytics.0001` and `analytics.0002` are still pending verification.
2. Set `FIRST_PARTY_ANALYTICS_ENABLED=true` in Django.
3. Generate a strong random `ANALYTICS_INGEST_KEY`; set the same value in Django
   and the Next.js server environment. NEVER use a `NEXT_PUBLIC_` prefix for it.
4. Set `NEXT_PUBLIC_FIRST_PARTY_ANALYTICS_ENABLED=true` in the storefront and
   rebuild/restart it. Keep `NEXT_PUBLIC_GA_ID` unset unless intentionally
   enabling GA4 after consent. Hardcoded unconditional GTM loading was removed.
5. Run Redis, Celery worker and Celery Beat. Beat drains the durable event inbox
   every 10 seconds and schedules provider refresh every six hours. No broker
   delivery is required to accept a browser event; pending rows survive outages.
6. Configure retention with `ANALYTICS_RETENTION_DAYS` (default 90, allowed 1–365).
   Daily cleanup removes only expired analytics events/attribution, never orders
   or financial records. Provider reporting snapshots are retained separately.
7. Verify opt-in, rejection, withdrawal, GPC, API ingress authorization, worker
   processing and resulting report rows in a browser before enabling publicly.
   Ensure your reverse proxy overwrites client-IP headers and applies shared
   edge rate limits/body limits; Next's local rate limiter is per process.

## External accounts (credentials and live validation required)

All Google connectors use server-side OAuth refresh:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
- GA4: `GA4_PROPERTY_ID`; authorize analytics.readonly and property access.
- Search Console: `SEARCH_CONSOLE_SITE` (exact verified property, e.g.
  `sc-domain:example.com`); authorize webmasters.readonly.
- Google Ads: `GOOGLE_ADS_CUSTOMER_ID` (digits only),
  `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_API_VERSION`, optionally
  `GOOGLE_ADS_LOGIN_CUSTOMER_ID`. Authorize adwords and account access.
- Meta Ads: `META_ADS_ACCESS_TOKEN`, `META_ADS_ACCOUNT_ID` (digits without `act_`),
  `META_ADS_API_VERSION`. Provide ads_read/account permission. Token renewal is
  an operator responsibility; do not put tokens into report parameters.

Select API versions supported by your accounts. Version strings are deliberately
not hardcoded. OAuth account-connection UI is not implemented; credentials must
be securely provisioned by an operator. No credentials were printed or changed.

Recent daily snapshots are replaced idempotently, not accumulated. Partial
paginated responses are never saved. Errors retain the previous good snapshot
and expose only a generic failure status. For historical backfill, after setup:

```powershell
python manage.py sync_analytics google_ads --start 2026-10-01 --end 2026-10-20
```

Use provider `ga4`, `search_console`, `google_ads` or `meta_ads`. Each backfill
accepts at most 31 days and must end before today. Provider APIs are read-only.
Mocked contract tests passed; live permissions/version compatibility, real API
pagination and external totals have NOT been verified. Meta documentation access
was rate-limited during implementation; validate its live response explicitly.

## Honest coverage and remaining limitations

- Collection is off by default. No past traffic is reconstructed. The dashboard
  distinguishes disabled collection, awaiting data, missing credentials, failed
  sync and available source data. Empty observations are not total-store zeros.
- Purchases are report-time joins to Django Paid orders, not client `purchase`
  events. Uncollected COD is excluded. Server-side GA4 purchase/refund export is
  not implemented; GA4 key events are provider metrics, not verified orders.
- Consent is optional and versioned; Global Privacy Control overrides consent.
  Withdrawal stops future tracking, clears local identifiers/GA cookies, and
  reloads to remove loaded Google scripts. It does not erase previously consented
  server history before retention expires. No device fingerprinting/IP geography.
- Known email/phone patterns in searches/UTMs are redacted, but free-text search
  can still contain personal information. Review privacy notice, retention and
  access controls before launch. Geolocation reporting is not implemented.
- Sessions are per tab, 30-minute inactivity; visitor IDs represent browsers,
  not unique people. All browser telemetry is untrusted and potentially lossy.
- Search metrics cover debounced suggestion searches/clicks, not every collection
  search or submitted query. Search conversion is same-session association.
- Web Vitals use document-load paths and latest metric revision; no synthetic
  measurements substitute for real users. Consent granted after load may produce
  incomplete observations. No SPA per-navigation performance certification.
- GA4 modeling/thresholding and Search Console top-row limitations are disclosed.
  User counts from separate providers/dimensions must not be summed.
- ROAS is explicitly **observed consent-attributed ROAS**, not modeled total
  campaign performance. Set `utm_campaign` to the exact provider campaign ID and
  `utm_source` to google/meta/facebook/instagram. No campaign-name fuzzy matching.
  It uses first observed session-page attribution within the selected window.
  It requires INR, Asia/Kolkata ad-account timezone and full spend-date coverage.
  Missing attribution, zero spend, incomplete dates, incompatible currency/timezone
  or unresolved refunds produce unknown ROAS, never an estimated actual value.
- Refund-adjusted merchandise revenue, return allocations, full financial
  settlement reconciliation, complete inventory history and fraud integrations
  from the earlier report-completion request remain separate unfinished work.

## Validation

Backend tests cover explicit consent, rejected browser purchases, event-ID
conflicts, duplicate processing, signed attribution, invalid tokens, partial
refund ROAS suppression, provider retries/replacement/failure preservation,
PII-pattern redaction and out-of-order Web Vital revisions.

TypeScript checks passed for storefront and MPS. Rendered Playwright verification
is blocked by sandbox `ERR_NETWORK_ACCESS_DENIED` to localhost; no screenshot or
end-to-end browser pass is claimed. A temporary QA script exists outside the repo
at `C:/Users/Admin/AppData/Local/Temp/perfumebooth-analytics-qa.cjs`.
