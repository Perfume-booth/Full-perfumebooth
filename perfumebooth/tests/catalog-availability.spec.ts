import { test, expect } from '@playwright/test';
import { availableUnits, catalogAvailable } from '../src/lib/catalog-availability';

test('stock is conservative and preserves zero', () => {
  expect(availableUnits({ stock: 0, stock_level: 99 })).toBe(0);
  expect(availableUnits({ stock: 3 })).toBe(3);
  expect(availableUnits({ quantityAvailable: 2 })).toBe(2);
  for (const item of [{}, { stock: -2 }, { stock: 'invalid' }]) expect(availableUnits(item)).toBe(0);
});

test('variant availability takes precedence over parent inventory', () => {
  expect(catalogAvailable({ is_online: true, stock: 30, variants: [{ stock: 0 }] })).toBe(false);
  expect(catalogAvailable({ is_online: true, stock: 0, variants: [{ stock: 2 }] })).toBe(true);
  expect(catalogAvailable({ is_online: false, variants: [{ stock: 2 }] })).toBe(false);
  expect(catalogAvailable({ is_online: true, variants: [{ stock: 2, is_active: false }] })).toBe(false);
});
