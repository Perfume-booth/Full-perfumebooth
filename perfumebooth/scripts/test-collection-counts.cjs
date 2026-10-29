// Run with: node scripts/test-collection-counts.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)(name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}
const query = load('src/lib/backend/collection-query.ts');
const products = Array.from({ length: 275 }, (_, i) => ({
  id: String(i), title: `Product ${i}`, vendor: i % 2 ? 'A' : 'B',
  productType: 'Perfume', gender: 'Men', category: 'Fragrance', tags: [],
  availableForSale: i % 2 === 0, rating: i % 2 ? 5 : 0, metafields: [],
  priceRange: { minVariantPrice: { amount: String(100 + i * 100) } },
}));
const collections = load('src/lib/backend/collections.ts', {
  './types': { unwrapApiData: x => x.data, ensureArray: x => x },
  './products': { mapDjangoProductToProduct: x => x, getFacets: () => { throw new Error('Global facets must not be used'); } },
  '../transformers': { cleanImageUrl: x => x },
  './collection-query': query,
});
global.fetch = async () => ({ ok: true, json: async () => ({ data: { title: 'Men', slug: 'men', products } }) });
(async () => {
  const first = await collections.getCollectionProducts('men', 80);
  assert.equal(first.totalCount, 275);
  assert.equal(first.products.length, 80);
  assert.equal(first.pageInfo.endCursor, '80');
  const last = await collections.getCollectionProducts('men', 80, '240');
  assert.equal(last.products.length, 35);
  assert.equal(last.totalCount, 275);
  assert.equal(last.pageInfo.hasNextPage, false);
  assert.equal(first.filters.find(f => f.label === 'Brand').values.reduce((sum, v) => sum + v.count, 0), 275);
  assert.equal(query.filterCollection(products, [{ productVendor: 'A' }, { productVendor: 'B' }]).length, 275);
  assert.equal(query.filterCollection(products, [{ gender: 'Women' }]).length, 0);
  assert.equal(query.filterCollection(products, [{ price: { max: 0 } }]).length, 0);
  const rated = await collections.getCollectionProducts('men', 80, null, [{ rating: 4 }]);
  assert.equal(rated.totalCount, 137);
  assert.equal(rated.products.length, 80);
  assert.equal(query.filterCollection(products, [{ available: true }]).length, 138);
  console.log('Collection regression checks passed: totals, >200 products, pagination, facets, multi-select, gender, price, rating, availability.');
})().catch(error => { console.error(error); process.exitCode = 1; });
