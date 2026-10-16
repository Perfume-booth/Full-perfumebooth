import { test, expect } from '@playwright/test';
import { cleanImageUrl } from '../src/lib/media-url';

test('local uploads use the same-origin media proxy', () => {
  for (const prefix of ['http://localhost:8000', 'http://django:8000', 'http://127.0.0.1:8000', 'http://localhost', 'https://localhost:8000']) {
    expect(cleanImageUrl(`${prefix}/media/products/photo.jpg?v=2#preview`)).toBe('/media/products/photo.jpg?v=2#preview');
  }
  for (const path of ['products/photo.jpg', '/products/photo.jpg', 'variants/photo.jpg', 'banners/mobile/photo.webp']) {
    expect(cleanImageUrl(path)).toBe(`/media/${path.replace(/^\//, '')}`);
  }
  expect(cleanImageUrl('media/banners/photo.webp')).toBe('/media/banners/photo.webp');
  expect(cleanImageUrl('/media/banners/photo.webp')).toBe('/media/banners/photo.webp');
});

test('external and static images are preserved without substring host replacement', () => {
  for (const url of ['/images/fallback-luxury.svg', 'https://cdn.example.com/media/photo.jpg?signature=abc', 'https://localhost.example.com/media/photo.jpg', 'https://cdn.example.com/photo.jpg?source=http://localhost:8000']) {
    expect(cleanImageUrl(url)).toBe(url);
  }
  expect(cleanImageUrl(null)).toBeUndefined();
  expect(cleanImageUrl(undefined)).toBeUndefined();
  expect(cleanImageUrl('')).toBeUndefined();
});
