import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { ColumnDataInfo, ForeignKeyInfo } from '@honuware/ui/access';
import { SimpleTextComponent } from '../simple-text/simple-text.component';
import { LongTextComponent } from '../long-text/long-text.component';
import { SimpleBoolComponent } from '../simple-bool/simple-bool.component';
import { SimpleDateComponent } from '../simple-date/simple-date.component';
import { SimpleEnumComponent } from '../simple-enum/simple-enum.component';
import { FkPickerComponent } from '../fk-picker/fk-picker.component';

@Component({
  selector: 'hw-composite-control',
  standalone: true,
  templateUrl: './composite-control.component.html',
  styleUrls: ['./composite-control.component.scss'],
  imports: [SimpleTextComponent, LongTextComponent, SimpleBoolComponent, SimpleDateComponent, SimpleEnumComponent, FkPickerComponent]
})
export class CompositeControlComponent implements OnChanges {
  @Input() dataInfo?: ColumnDataInfo;
  @Input() value?: string;
  @Input() readOnly: boolean = false;
  @Input() foreignKeyInfo?: ForeignKeyInfo;
  @Output() valueChanged = new EventEmitter<string>();

  isLoading: boolean = true;

  activeComponent: 'text' | 'long-text' | 'bool' | 'date' | 'time' | 'enum' | 'fk' | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dataInfo'] || changes['foreignKeyInfo']) {
      this.isLoading = !this.dataInfo;
      this.activeComponent = this.determineActiveComponent();
    }
  }

  private determineActiveComponent(): 'text' | 'long-text' | 'bool' | 'date' | 'time' | 'enum' | 'fk' | null {
    // FK columns take priority when foreignKeyInfo is provided
    if (this.foreignKeyInfo) {
      return 'fk';
    }

    // Auto-detect bool columns even without explicit html_input_type
    if (!this.dataInfo?.html_input_type && this.dataInfo?.type === 'bool') {
      return 'bool';
    }

    switch (this.dataInfo?.html_input_type) {
      case 'enum':
        return 'enum';
      case 'long-text':
        return 'long-text';
      case 'bool':
      case 'checkbox':
        return 'bool';
      case 'date':
      case 'time':
        return 'date';
      case 'text':
      default:
        // Default to text for unknown or unspecified types
        return 'text';
    }
  }

  onValueChanged(value: string): void {
    this.valueChanged.emit(value);
  }
}
