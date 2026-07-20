import { Component, Input, OnChanges, OnInit, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ColumnDataInfo } from '@honuware/ui/access';

@Component({
  standalone: true,
  selector: 'hw-simple-bool',
  imports: [ReactiveFormsModule, MatCheckboxModule],
  templateUrl: './simple-bool.component.html',
  styleUrls: ['./simple-bool.component.scss']
})
export class SimpleBoolComponent implements OnInit, OnChanges {
  @Input() dataInfo?: ColumnDataInfo;
  @Input() value?: string;
  @Input() readOnly = false;
  @Output() checkboxValueChange = new EventEmitter<string>();

  checkboxControl: FormControl = new FormControl(false);
  isLoading = true;
  private skipValueChanges = false;

  private isTrueValue(value: string | undefined): boolean {
    return value === 'true' || value === 't';
  }

  ngOnInit(): void {
    const initialValue = this.value !== undefined
      ? this.isTrueValue(this.value)
      : this.isTrueValue(this.dataInfo?.default_value);
    this.checkboxControl.setValue(initialValue, { emitEvent: false });
    this.checkboxControl.updateValueAndValidity();

    if (this.readOnly) {
      this.checkboxControl.disable();
    }

    this.checkboxControl.valueChanges.subscribe((value) => {
      if (!this.skipValueChanges) {
        this.emitCheckboxValue(value);
      }
    });

    this.isLoading = false;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dataInfo'] && this.dataInfo) {
      this.skipValueChanges = true;
      const newValue = this.value !== undefined
        ? this.isTrueValue(this.value)
        : this.isTrueValue(this.dataInfo.default_value);
      this.checkboxControl.setValue(newValue, { emitEvent: false });
      this.checkboxControl.updateValueAndValidity();
      this.skipValueChanges = false;
    }
    if (changes['value'] && !changes['value'].firstChange) {
      this.skipValueChanges = true;
      const newValue = this.isTrueValue(this.value);
      this.checkboxControl.setValue(newValue, { emitEvent: false });
      this.checkboxControl.updateValueAndValidity();
      this.skipValueChanges = false;
    }
    if (changes['readOnly'] && !changes['readOnly'].firstChange) {
      if (this.readOnly) {
        this.checkboxControl.disable();
      } else {
        this.checkboxControl.enable();
      }
    }
  }

  private emitCheckboxValue(value: boolean | null): void {
    const emittedValue = value ? 'true' : 'false';
    this.checkboxValueChange.emit(emittedValue);
  }
}
