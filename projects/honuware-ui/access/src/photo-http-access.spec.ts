import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PhotoHttpAccess } from './photo-http-access';

describe('PhotoHttpAccess', () => {
  let svc: PhotoHttpAccess;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PhotoHttpAccess],
    });
    svc = TestBed.inject(PhotoHttpAccess);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uploadPhoto POSTs the binary to the table/item/type path (type shortened)', () => {
    const data = new ArrayBuffer(4);
    svc.uploadPhoto('classes', 7, data, 'image/jpeg').subscribe();
    const req = http.expectOne('/api/upload_photo/classes/7/jpeg');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBe(data);
    req.flush({ source_photo_id: 1, type: 'jpeg', width: 10, height: 10 });
  });

  it('hasPhoto GETs the has_photo path', () => {
    svc.hasPhoto('classes', 7).subscribe();
    const req = http.expectOne('/api/has_photo/classes/7');
    expect(req.request.method).toBe('GET');
    req.flush({ has_photo: true });
  });

  it('deletePhoto POSTs to the delete_photo path', () => {
    svc.deletePhoto('classes', 7).subscribe();
    const req = http.expectOne('/api/delete_photo/classes/7');
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });
});
