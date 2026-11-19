import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { throwError } from 'rxjs';
import { HONUWARE_IMAGE_UPLOAD_SETTINGS_ACCESS } from '@honuware/ui/access';
import { MockImageUploadSettingsAccess } from '@honuware/ui/testing';

import { ImageUploadSettingsComponent } from './image-upload-settings.component';

const MB = 1024 * 1024;

describe('ImageUploadSettingsComponent', () => {
  function render(access = new MockImageUploadSettingsAccess()) {
    TestBed.configureTestingModule({
      imports: [ImageUploadSettingsComponent],
      providers: [
        provideNoopAnimations(),
        { provide: HONUWARE_IMAGE_UPLOAD_SETTINGS_ACCESS, useValue: access },
      ],
    });
    const fixture = TestBed.createComponent(ImageUploadSettingsComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const input = () => element.querySelector('input') as HTMLInputElement;
    const button = (label: string) =>
      Array.from(element.querySelectorAll('button')).find((b) => b.textContent?.trim() === label)!;
    const type = (value: string) => {
      input().value = value;
      input().dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    const save = () => {
      element.querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
    };
    return { fixture, element, access, input, button, type, save, component: fixture.componentInstance };
  }

  it('shows the limit in megabytes, with the range and the default', () => {
    const { element, input } = render();
    expect(input().value).toBe('10');
    expect(element.textContent).toContain('Now 10 MB; the default is 10 MB.');
    expect(element.textContent).toContain('1 to 50 MB');
  });

  it('saves a new limit in bytes and says so', () => {
    const { element, access, type, save } = render();
    type('25');
    save();
    expect(access.maxUploadBytes).toBe(25 * MB);
    expect(element.textContent).toContain('Saved. The limit is now 25 MB.');
  });

  it('offers nothing to save until the limit changes', () => {
    const { button, type } = render();
    expect(button('Save').disabled).toBeTrue();
    type('11');
    expect(button('Save').disabled).toBeFalse();
  });

  it('asks for a whole number in range, and sends nothing until it gets one', () => {
    const { element, access, type, save } = render();
    spyOn(access, 'saveSettings').and.callThrough();
    for (const value of ['0', '51', '12.5', '']) {
      type(value);
      save();
      expect(element.textContent).withContext(value)
        .toContain('Enter a whole number of megabytes from 1 to 50.');
    }
    expect(access.saveSettings).not.toHaveBeenCalled();
  });

  it("shows the server's reason when it refuses", () => {
    const access = new MockImageUploadSettingsAccess();
    spyOn(access, 'saveSettings').and.returnValue(throwError(() => ({
      status: 400, error: { detail: 'The upload limit must be from 1 to 50 MB.' },
    })));
    const { element, type, save } = render(access);
    type('20');
    save();
    expect(element.textContent).toContain('The upload limit must be from 1 to 50 MB.');
  });

  it('offers a retry when the save fails another way', () => {
    const access = new MockImageUploadSettingsAccess();
    spyOn(access, 'saveSettings').and.returnValue(throwError(() => ({ status: 500 })));
    const { element, type, save } = render(access);
    type('20');
    save();
    expect(element.textContent).toContain("The upload limit couldn't be saved. Please try again.");
  });

  it('puts the default back in the field', () => {
    const access = new MockImageUploadSettingsAccess();
    access.maxUploadBytes = 30 * MB;
    const { fixture, input, button } = render(access);
    expect(input().value).toBe('30');
    button('Use the default').click();
    fixture.detectChanges();
    expect(input().value).toBe('10');
  });

  it('says when the limit cannot be loaded, and tries again', () => {
    const access = new MockImageUploadSettingsAccess();
    const getSettings = spyOn(access, 'getSettings').and.returnValue(throwError(() => ({ status: 403 })));
    const { fixture, element, button, input } = render(access);
    expect(element.textContent).toContain("The upload limit couldn't be loaded.");

    getSettings.and.callThrough();
    button('Try again').click();
    fixture.detectChanges();
    expect(input().value).toBe('10');
  });
});
