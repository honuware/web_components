import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { ColumnDataInfo } from '@honuware/ui/access';
import { isMicrosecondTimestamp, microsToDate, dateToMicros } from '@honuware/ui/foundation';

@Component({
  selector: 'hw-simple-date',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatDatepickerModule,
    MatTimepickerModule,
  ],
  templateUrl: './simple-date.component.html',
  styleUrls: ['./simple-date.component.scss'],
})
export class SimpleDateComponent implements OnInit, OnChanges {
  @Input() dataInfo?: ColumnDataInfo;
  @Input() value?: string;
  @Input() loading = true;
  @Input() readOnly = false;
  @Input() type: 'datetime' | 'date' | 'time' = 'datetime';
  // Minutes between selectable timepicker options. Default 20 matches the
  // calendar's old TIME_SEGMENT_INCREMENT_MIN — callers that need a different
  // granularity pass it in, so the control no longer depends on @pages/calendar.
  @Input() timeIncrementMinutes = 20;

  @Output() valueChange = new EventEmitter<string>();

  dateControl = new FormControl();

  private isMicrosecondInput = false;

  private isBigIntColumn(): boolean {
    return this.dataInfo?.type === 'BIGINT';
  }

  private parseInputValue(value: string): Date | null {
    if (!value) return null;
    if (isMicrosecondTimestamp(value)) {
      this.isMicrosecondInput = true;
      return microsToDate(value);
    }
    this.isMicrosecondInput = false;
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  ngOnInit(): void {
    // BIGINT date columns always use microseconds, even for new items
    // where there's no existing value to detect the format from.
    if (this.isBigIntColumn()) {
      this.isMicrosecondInput = true;
    }

    const initialValue = this.value ?? this.dataInfo?.default_value ?? '';
    const initialDate = this.parseInputValue(initialValue);
    this.dateControl = new FormControl(
      initialDate,
      {
        validators: this.dataInfo?.required ? [Validators.required] : [],
      }
    );

    if (this.readOnly) {
      this.dateControl.disable();
    }

    this.dateControl.valueChanges.subscribe((value: Date | string | null) => {
      if (value && this.dateControl.valid && Date.parse(String(value))) {
        const date = new Date(Date.parse(String(value)));
        if (this.isMicrosecondInput) {
          this.valueChange.emit(dateToMicros(date));
        } else {
          this.valueChange.emit(date.toISOString());
        }
      }
    });

    this.loading = false;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dataInfo'] && !changes['dataInfo'].firstChange) {
      const newValue = this.value ?? this.dataInfo?.default_value ?? '';
      const newDate = this.parseInputValue(newValue);
      this.dateControl.setValue(
        newDate,
        { emitEvent: false }
      );
      this.dateControl.updateValueAndValidity();
    }
    if (changes['value'] && !changes['value'].firstChange) {
      const newDate = this.parseInputValue(this.value ?? '');
      this.dateControl.setValue(
        newDate,
        { emitEvent: false }
      );
      this.dateControl.updateValueAndValidity();
    }
    if (changes['readOnly'] && !changes['readOnly'].firstChange) {
      if (this.readOnly) {
        this.dateControl.disable();
      } else {
        this.dateControl.enable();
      }
    }
  }
}
