import { TestBed } from '@angular/core/testing';
import { HONUWARE_IMAGE_UPLOAD_SETTINGS_ACCESS, ImageUploadSettings } from '@honuware/ui/access';
import { MockImageUploadSettingsAccess } from './mock-image-upload-settings-access';
import { HonuwareAccessMocks, provideHonuwareAccessMock } from './provide-honuware-access-mock';

const MB = 1024 * 1024;

describe('MockImageUploadSettingsAccess', () => {
  it('starts at the server default, with its range', () => {
    const access = new MockImageUploadSettingsAccess();
    let settings: ImageUploadSettings | undefined;
    access.getSettings().subscribe((s) => (settings = s));
    expect(settings).toEqual({
      max_upload_bytes: 10 * MB,
      default_bytes: 10 * MB,
      minimum_bytes: 1 * MB,
      maximum_bytes: 50 * MB,
    });
  });

  it('saves a limit in range, and everyone then reads it', () => {
    const access = new MockImageUploadSettingsAccess();
    let saved: number | undefined;
    access.saveSettings(25 * MB).subscribe((s) => (saved = s.max_upload_bytes));
    expect(saved).toBe(25 * MB);

    let limit: number | undefined;
    access.getUploadLimit().subscribe((r) => (limit = r.max_upload_bytes));
    expect(limit).toBe(25 * MB);
  });

  it('refuses a limit out of range or not whole, as the server does, and keeps the old one', () => {
    const access = new MockImageUploadSettingsAccess();
    for (const bytes of [MB - 1, 50 * MB + 1, 0, 10.5 * MB + 0.5]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let refusal: any;
      access.saveSettings(bytes).subscribe({ error: (e) => (refusal = e) });
      expect(refusal?.status).withContext(`${bytes}`).toBe(400);
      expect(refusal?.error?.field).toBe('max_upload_bytes');
      expect(refusal?.error?.detail).toMatch(/upload limit must be/);
    }
    expect(access.maxUploadBytes).toBe(10 * MB);
  });

  it('is wired by provideHonuwareAccessMock and captured with the others', () => {
    let captured: HonuwareAccessMocks | undefined;
    TestBed.configureTestingModule({
      providers: [provideHonuwareAccessMock({}, (m) => (captured = m))],
    });
    expect(captured?.imageUploadSettings).toBeInstanceOf(MockImageUploadSettingsAccess);
    expect(TestBed.inject(HONUWARE_IMAGE_UPLOAD_SETTINGS_ACCESS)).toBe(captured!.imageUploadSettings);
  });
});
