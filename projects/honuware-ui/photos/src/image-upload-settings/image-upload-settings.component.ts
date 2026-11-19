import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  HONUWARE_IMAGE_UPLOAD_SETTINGS_ACCESS,
  ImageUploadSettings,
  ImageUploadSettingsAccess,
} from '@honuware/ui/access';

import { formatMegabytes } from '../prepare-image-for-upload';

const BYTES_PER_MEGABYTE = 1024 * 1024;

/**
 * The image upload limit, as a card for an app's admin settings page
 * (CommunityFinder CM3 Phase 2 §13.2, OQ21): the largest image anyone may
 * upload, in whole megabytes, within the range the server allows (1 to 50 MB;
 * 10 MB by default). The server's settings routes are admin_portal only; this
 * card doesn't hide itself, so put it on a page only admins reach.
 */
@Component({
  selector: 'hw-image-upload-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './image-upload-settings.component.html',
  styleUrls: ['./image-upload-settings.component.scss']
})
export class ImageUploadSettingsComponent implements OnInit {
  settings: ImageUploadSettings | null = null;
  loading = true;
  loadFailed = false;
  saving = false;
  /** Shown after a save, until the next edit. */
  saved = false;
  saveError = '';

  readonly megabytes = new FormControl<number | null>(null);
  // The form's group, so (ngSubmit) comes from FormGroupDirective rather than
  // a native submit.
  readonly form = new FormGroup({ megabytes: this.megabytes });

  constructor(
    @Inject(HONUWARE_IMAGE_UPLOAD_SETTINGS_ACCESS) private access: ImageUploadSettingsAccess,
  ) {
    this.megabytes.valueChanges.subscribe(() => {
      this.saved = false;
      this.saveError = '';
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loadFailed = false;
    this.access.getSettings().subscribe({
      next: settings => {
        this.show(settings);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.loadFailed = true;
      },
    });
  }

  get minimumMegabytes(): number {
    return (this.settings?.minimum_bytes ?? BYTES_PER_MEGABYTE) / BYTES_PER_MEGABYTE;
  }

  get maximumMegabytes(): number {
    return (this.settings?.maximum_bytes ?? 50 * BYTES_PER_MEGABYTE) / BYTES_PER_MEGABYTE;
  }

  get defaultLabel(): string {
    return formatMegabytes(this.settings?.default_bytes ?? 10 * BYTES_PER_MEGABYTE);
  }

  get currentLabel(): string {
    return this.settings ? formatMegabytes(this.settings.max_upload_bytes) : '';
  }

  /** Nothing to save: the field holds the stored limit. */
  get unchanged(): boolean {
    return this.settings !== null
      && this.megabytes.value !== null
      && this.megabytes.value * BYTES_PER_MEGABYTE === this.settings.max_upload_bytes;
  }

  get problem(): string {
    const value = this.megabytes.value;
    if (value === null || !Number.isInteger(value)
        || value < this.minimumMegabytes || value > this.maximumMegabytes) {
      return `Enter a whole number of megabytes from ${this.minimumMegabytes} to ${this.maximumMegabytes}.`;
    }
    return '';
  }

  useDefault(): void {
    if (this.settings) {
      this.megabytes.setValue(this.settings.default_bytes / BYTES_PER_MEGABYTE);
    }
  }

  save(): void {
    this.megabytes.markAsTouched();
    if (this.problem || this.unchanged || this.saving) {
      return;
    }
    this.saving = true;
    this.saveError = '';
    this.access.saveSettings((this.megabytes.value as number) * BYTES_PER_MEGABYTE).subscribe({
      next: settings => {
        this.show(settings);
        this.saving = false;
        this.saved = true;
      },
      error: (err) => {
        this.saving = false;
        // The server's own words for a refused value; otherwise a retry.
        const detail = err?.status === 400 ? err?.error?.detail : '';
        this.saveError = typeof detail === 'string' && detail
          ? detail
          : "The upload limit couldn't be saved. Please try again.";
      },
    });
  }

  private show(settings: ImageUploadSettings): void {
    this.settings = settings;
    // A limit set by hand may not be whole megabytes: show it to one decimal,
    // and the field will ask for a whole number before saving.
    const megabytes = Math.round((settings.max_upload_bytes / BYTES_PER_MEGABYTE) * 10) / 10;
    this.megabytes.setValue(megabytes, { emitEvent: false });
    this.megabytes.setValidators([
      Validators.required,
      Validators.min(this.minimumMegabytes),
      Validators.max(this.maximumMegabytes),
    ]);
    this.megabytes.updateValueAndValidity({ emitEvent: false });
  }
}
