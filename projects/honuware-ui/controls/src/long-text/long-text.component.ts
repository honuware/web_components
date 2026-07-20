import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { ColumnDataInfo } from '@honuware/ui/access';


@Component({
  selector: 'hw-long-text',
  templateUrl: './long-text.component.html',
  styleUrls: ['./long-text.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
})
export class LongTextComponent implements OnInit, OnChanges {
  @Input() dataInfo?: ColumnDataInfo;
  @Input() value?: string;
  @Input() readOnly: boolean = false;
  @Output() valueChanged = new EventEmitter<string>();

  textInput: FormControl = new FormControl('');
  isLoading: boolean = true;
  private skipValueChanges: boolean = false;

  get displayLabel(): string {
    return this.dataInfo?.label || this.dataInfo?.column_friendly_name || this.dataInfo?.column_name || '';
  }

  ngOnInit(): void {
    const initialValue = this.value ?? this.dataInfo?.default_value ?? '';
    this.textInput.setValue(initialValue, { emitEvent: false });
    this.textInput.setValidators(this.getValidators());

    if (this.readOnly) {
      this.textInput.disable();
    }

    this.textInput.valueChanges.subscribe((value: string) => {
      if (!this.skipValueChanges) {
        this.valueChanged.emit(value);
      }
    });

    this.isLoading = false;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dataInfo'] && !changes['dataInfo'].firstChange) {
      this.skipValueChanges = true;
      const newValue = this.value ?? this.dataInfo?.default_value ?? '';
      this.textInput.setValue(newValue, { emitEvent: false });
      this.textInput.setValidators(this.getValidators());
      this.textInput.updateValueAndValidity();
      this.skipValueChanges = false;
    }
    if (changes['value'] && !changes['value'].firstChange) {
      this.skipValueChanges = true;
      this.textInput.setValue(this.value ?? '', { emitEvent: false });
      this.textInput.setValidators(this.getValidators());
      this.textInput.updateValueAndValidity();
      this.skipValueChanges = false;
    }
  }

  private getValidators() {
    const validators = [];
    if (this.dataInfo?.required) {
      validators.push(Validators.required);
    }
    if (this.dataInfo?.max_length) {
      validators.push(Validators.maxLength(this.dataInfo.max_length));
    }
    if (this.dataInfo?.regex) {
      validators.push(Validators.pattern(this.dataInfo.regex));
    }
    return validators;
  }
}
