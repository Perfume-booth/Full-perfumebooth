# Native reviews and one-time legacy import

Django stores and serves reviews. Judge.me credentials are not used by the
storefront or needed after migration. Never put private tokens in NEXT_PUBLIC
variables, source control or import files.

## Import an export

Keep a private backup of the original Judge.me CSV/JSON export and the database.
Do not commit exports containing customer details. Use a consistent source-store
identifier on every run, preferably the original shop domain.

```powershell
python manage.py migrate shop
python manage.py import_judgeme_reviews D:/private/reviews.json --source-store old-store.myshopify.com
```

The default is a dry run. Resolve every reported row first. Then:

```powershell
python manage.py import_judgeme_reviews D:/private/reviews.json --source-store old-store.myshopify.com --apply
```

The source file must provide a product handle (or product URL), rating from 1–5,
original ISO date, reviewer name, title/body and publication/verification status.
Nested API reviewer/product objects are supported. For source product IDs only,
provide `--product-map D:/private/product-map.json`, a JSON object mapping source
IDs to exact existing catalog slugs. Internal source IDs must not be guessed from
new database IDs.

All rows validate before any write. Unmatched products, invalid dates/ratings and
store-level reviews block the batch rather than being silently discarded.
Unknown publication status stays pending. Only explicit verified statuses receive
a verified badge. No customer accounts are created. Source review IDs prevent
duplicates; exports without IDs use a stable content fingerprint. Keep the same
export format on retries. Existing imports, including moderation changes, are not
overwritten. Separate review IDs from one reviewer are retained independently.

Review picture references are retained as private migration metadata, not copied
to R2 or displayed yet. Preserve the original export for media/reply migration.
Store-level reviews require separate handling. This command imports product
reviews only; it does not retrieve reviews from Judge.me automatically.

The storefront review proxy now uses Django exclusively. Backend failures return
an error, never a fabricated successful/verified review. Existing local JSON files
are preserved on disk but no longer merged into public review results.
