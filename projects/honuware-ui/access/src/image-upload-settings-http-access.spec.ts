import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { HONUWARE_IMAGE_UPLOAD_SETTINGS_ACCESS, provideHonuwareAccess } from './access-tokens';
import { ImageUploadSettings } from './image-upload-settings-access';
import { ImageUploadSettingsHttpAccess } from './image-upload-settings-http-access';

const SETTINGS: ImageUploadSettings = {
  max_upload_bytes: 10485760,
  default_bytes: 10485760,
  minimum_bytes: 1048576,
  maximum_bytes: 52428800,
};

describe('ImageUploadSettingsHttpAccess', () => {
  let svc: ImageUploadSettingsHttpAccess;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(ImageUploadSettingsHttpAccess);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getUploadLimit GETs the signed-in read, with the session cookie', () => {
    let limit: number | undefined;
    svc.getUploadLimit().subscribe((r) => (limit = r.max_upload_bytes));
    const req = http.expectOne('/api/image_upload_limit');
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush({ max_upload_bytes: 20971520 });
    expect(limit).toBe(20971520);
  });

  it('getSettings GETs the admin settings', () => {
    let settings: ImageUploadSettings | undefined;
    svc.getSettings().subscribe((s) => (settings = s));
    const req = http.expectOne('/api/admin/image_upload_settings');
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();
    req.flush(SETTINGS);
    expect(settings).toEqual(SETTINGS);
  });

  it('saveSettings PUTs the new limit in bytes', () => {
    svc.saveSettings(26214400).subscribe();
    const req = http.expectOne('/api/admin/image_upload_settings');
    expect(req.request.method).toBe('PUT');
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.body).toEqual({ max_upload_bytes: 26214400 });
    req.flush({ ...SETTINGS, max_upload_bytes: 26214400 });
  });

  it('is what the token resolves to by default, and in http mode', () => {
    expect(TestBed.inject(HONUWARE_IMAGE_UPLOAD_SETTINGS_ACCESS)).toBe(svc);
  });
});

describe('provideHonuwareAccess and the upload limit', () => {
  it('mock mode provides a supplied implementation for the token', () => {
    const supplied = {
      getUploadLimit: jasmine.createSpy(),
      getSettings: jasmine.createSpy(),
      saveSettings: jasmine.createSpy(),
    };
    TestBed.configureTestingModule({
      providers: [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        provideHonuwareAccess({ mode: 'mock', crud: {} as any, auth: {} as any, photo: {} as any,
          imageUploadSettings: supplied }),
      ],
    });
    expect(TestBed.inject(HONUWARE_IMAGE_UPLOAD_SETTINGS_ACCESS)).toBe(supplied);
  });
});
