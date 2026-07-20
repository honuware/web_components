import { Component, Input, OnChanges, OnInit, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ColumnDataInfo } from '@honuware/ui/access';

@Component({
  standalone: true,
  selector: 'hw-simple-enum',
  imports: [ReactiveFormsModule, MatSelectModule, MatFormFieldModule],
  templateUrl: './simple-enum.component.html',
  styleUrls: ['./simple-enum.component.scss']
})
export class SimpleEnumComponent implements OnInit, OnChanges {
  @Input() dataInfo?: ColumnDataInfo;
  @Input() value?: string;
  @Input() readOnly = false;
  @Output() enumValueChange = new EventEmitter<string>();

  selectControl: FormControl = new FormControl('');
  isLoading = true;
  private skipValueChanges = false;

  ngOnInit(): void {
    const initialValue = this.value !== undefined
      ? this.value
      : (this.dataInfo?.default_value ?? '');
    this.selectControl.setValue(initialValue, { emitEvent: false });

    if (this.readOnly) {
      this.selectControl.disable();
    }

    this.selectControl.valueChanges.subscribe((value) => {
      if (!this.skipValueChanges) {
        this.enumValueChange.emit(value);
      }
    });

    this.isLoading = false;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dataInfo'] && this.dataInfo) {
      this.skipValueChanges = true;
      const newValue = this.value !== undefined
        ? this.value
        : (this.dataInfo.default_value ?? '');
      this.selectControl.setValue(newValue, { emitEvent: false });
      this.skipValueChanges = false;
    }
    if (changes['value'] && !changes['value'].firstChange) {
      this.skipValueChanges = true;
      this.selectControl.setValue(this.value ?? '', { emitEvent: false });
      this.skipValueChanges = false;
    }
    if (changes['readOnly'] && !changes['readOnly'].firstChange) {
      if (this.readOnly) {
        this.selectControl.disable();
      } else {
        this.selectControl.enable();
      }
    }
  }
}
