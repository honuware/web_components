import { TestBed } from '@angular/core/testing';

import { PhotoUrlBuilder } from './photo-url-builder';
import { HONUWARE_API_BASE } from './api-base';

describe('PhotoUrlBuilder', () => {
  it('HONUWARE_API_BASE defaults to /api', () => {
    TestBed.configureTestingModule({});
    expect(TestBed.inject(HONUWARE_API_BASE)).toBe('/api');
  });

  it('builds scaled photo URLs under the default base path', () => {
    TestBed.configureTestingModule({});
    const builder = TestBed.inject(PhotoUrlBuilder);
    expect(builder.scaledPhotoUrl('products', 7, 300, 300))
      .toBe('/api/get_scaled_photo/products/7/300/300');
  });

  it('accepts string item ids (table rows carry PKs as strings)', () => {
    TestBed.configureTestingModule({});
    const builder = TestBed.inject(PhotoUrlBuilder);
    expect(builder.scaledPhotoUrl('classes', '42', 50, 50))
      .toBe('/api/get_scaled_photo/classes/42/50/50');
  });

  it('honors an overridden base path', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: HONUWARE_API_BASE, useValue: 'https://api.example.com/api' }],
    });
    const builder = TestBed.inject(PhotoUrlBuilder);
    expect(builder.scaledPhotoUrl('products', 7, 300, 300))
      .toBe('https://api.example.com/api/get_scaled_photo/products/7/300/300');
  });
});
