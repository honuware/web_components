import {
  Component,
  Inject,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ColumnDataInfo, ForeignKeyInfo, FkOption, CrudAccess, HONUWARE_CRUD_ACCESS } from '@honuware/ui/access';

@Component({
  selector: 'hw-fk-picker',
  standalone: true,
  templateUrl: './fk-picker.component.html',
  styleUrls: ['./fk-picker.component.scss'],
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule
],
})
export class FkPickerComponent implements OnInit, OnChanges, OnDestroy {
  @Input() dataInfo?: ColumnDataInfo;
  @Input() value?: string;
  @Input() readOnly = false;
  @Input() foreignKeyInfo?: ForeignKeyInfo;
  @Input() preloadThreshold = 50;
  @Output() valueChanged = new EventEmitter<string>();

  searchControl = new FormControl('');
  filteredOptions: FkOption[] = [];
  isLoading = true;
  resolvedDisplayText = '';

  private selectedValue = '';
  private skipValueChanges = false;
  private searchSubject = new Subject<string>();
  private subscriptions: Subscription[] = [];

  constructor(@Inject(HONUWARE_CRUD_ACCESS) private serverAccess: CrudAccess) {}

  get displayLabel(): string {
    return this.dataInfo?.label || this.dataInfo?.column_friendly_name || this.dataInfo?.column_name || '';
  }

  ngOnInit(): void {
    this.selectedValue = this.value ?? '';

    if (this.readOnly) {
      this.searchControl.disable();
      this.resolveDisplayText();
    } else {
      this.setupSearch();
      this.loadInitialOptions();
    }

    this.isLoading = false;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && !changes['value'].firstChange) {
      this.skipValueChanges = true;
      this.selectedValue = this.value ?? '';
      if (this.readOnly) {
        this.resolveDisplayText();
      } else {
        this.updateSearchControlFromValue();
      }
      this.skipValueChanges = false;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.searchSubject.complete();
  }

  displayFn = (option: FkOption | string): string => {
    if (typeof option === 'string') return option;
    return option?.display ?? '';
  };

  onOptionSelected(event: { option: { value: FkOption } }): void {
    const selected = event.option.value;
    this.selectedValue = selected.value;
    this.valueChanged.emit(selected.value);
  }

  private setupSearch(): void {
    const searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(searchText => {
        const tableName = this.foreignKeyInfo?.parent_table_name ?? '';
        return this.serverAccess.getFkOptions(tableName, searchText, 50);
      }),
    ).subscribe(response => {
      this.filteredOptions = response.options;
    });
    this.subscriptions.push(searchSub);

    const valueChangesSub = this.searchControl.valueChanges.subscribe(value => {
      if (this.skipValueChanges) return;
      // If the user is typing (not selecting), trigger search
      if (typeof value === 'string') {
        this.searchSubject.next(value);
      }
    });
    this.subscriptions.push(valueChangesSub);
  }

  private loadInitialOptions(): void {
    const tableName = this.foreignKeyInfo?.parent_table_name ?? '';
    if (!tableName) return;

    this.serverAccess.getFkOptions(tableName, '', this.preloadThreshold).subscribe(response => {
      this.filteredOptions = response.options;
      this.updateSearchControlFromValue();
    });
  }

  private updateSearchControlFromValue(): void {
    if (!this.selectedValue) return;
    const match = this.filteredOptions.find(o => o.value === this.selectedValue);
    if (match) {
      this.searchControl.setValue(match as unknown as string, { emitEvent: false });
    } else {
      // Value not in loaded options; resolve display text
      const tableName = this.foreignKeyInfo?.parent_table_name ?? '';
      if (tableName) {
        this.serverAccess.resolveFkDisplay(tableName, [this.selectedValue]).subscribe(response => {
          const displayText = response.resolved[this.selectedValue] ?? this.selectedValue;
          const syntheticOption: FkOption = { value: this.selectedValue, display: displayText };
          this.searchControl.setValue(syntheticOption as unknown as string, { emitEvent: false });
        });
      }
    }
  }

  private resolveDisplayText(): void {
    if (!this.selectedValue || !this.foreignKeyInfo?.parent_table_name) {
      this.resolvedDisplayText = this.selectedValue;
      return;
    }
    this.serverAccess.resolveFkDisplay(
      this.foreignKeyInfo.parent_table_name,
      [this.selectedValue],
    ).subscribe(response => {
      this.resolvedDisplayText = response.resolved[this.selectedValue] ?? this.selectedValue;
    });
  }
}
