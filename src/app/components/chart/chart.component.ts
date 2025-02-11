import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, viewChild } from '@angular/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { MarketsService } from '../../services/markets.service';
import { combineLatest, distinctUntilChanged, filter, map, Observable, of, startWith, switchMap } from 'rxjs';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DATE_LOCALE, MAT_NATIVE_DATE_FORMATS, MatDateFormats, provideNativeDateAdapter } from '@angular/material/core';
import { AsyncPipe } from '@angular/common';
import { MatAutocomplete, MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { Period, periods } from '../../models/chart.model';

interface DateRange {
  start: Date;
  end: Date;
}

interface ChartData {
  name: string;
  series: {
    value: number;
    name: Date;
  }[];
}

const DATE_FORMATS: MatDateFormats = {
  ...MAT_NATIVE_DATE_FORMATS,
  display: {
    ...MAT_NATIVE_DATE_FORMATS.display,
    dateInput: {
      month: 'short',
      day: '2-digit',
    } as Intl.DateTimeFormatOptions,
  }
};

@Component({
  selector: 'app-chart',
  imports: [
    NgxChartsModule,
    FormsModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatAutocompleteModule,
    MatInputModule,
    AsyncPipe
  ],
  providers: [
    provideNativeDateAdapter(DATE_FORMATS),
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }
  ],
  templateUrl: './chart.component.html',
  styleUrl: './chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChartComponent implements OnInit, AfterViewInit {
  periodAutocomplete = viewChild<MatAutocomplete>('periodAutocomplete');
  
  readonly range: FormGroup<{
    start: FormControl<Date | null>;
    end: FormControl<Date | null>;
  }>;

  readonly colorScheme = {
    domain: ['#5AA454', '#E44D25', '#CFC0BB', '#7aa3e5', '#a8385d', '#aae3f5']
  };
  readonly view = [466, 400] as [number, number];

  readonly periods = periods;
  periodControl: FormControl<Period | null>;

  chartData$?: Observable<ChartData[] | null>;
  dateRange$: Observable<DateRange>;

  constructor(
    private marketsService: MarketsService,
    private cd: ChangeDetectorRef
  ) {
    this.range = this.marketsService.range;
    this.periodControl = this.marketsService.periodControl;

    this.dateRange$ = this.range.valueChanges.pipe(
      startWith(this.range.value),
      distinctUntilChanged((prev, cur) => prev.start?.getTime() !== cur.start?.getTime() && cur.end !== null),
      map((range) => {
        if (!range.start || !range.end)
          return null;
  
        return {
          start: new Date(range.start.setHours(0,0,0,0)),
          end: new Date(range.end.setHours(23,59,59,999))
        }
      }),
      filter((range) => !!range)
    );
  }

  ngOnInit(): void {
    this.chartData$ = combineLatest([
      this.marketsService.currentInstrumentIdSubject,
      this.dateRange$,
      this.periodControl.valueChanges.pipe(
        filter((period) => !!period),
        startWith(this.periodControl.value ?? periods[0]),
        distinctUntilChanged()
      )
    ]).pipe(
      switchMap(([id, range, period]) => id ? this.marketsService.getDateRange(id, range.start, range.end, period) : of(null)),
      map((response) => {
        if (!response)
          return null;

        const getLineData = (type: 'o' | 'h' |'l' | 'c') => ({
          name: type.toUpperCase(),
          series: response.map((value) => ({
            value: value[type],
            name: new Date(value.t)
          }))
        });

        return [
          getLineData('o'),
          getLineData('h'),
          getLineData('l'),
          getLineData('c')
        ];
      }),
    );
  }

  ngAfterViewInit(): void {
    if (!this.periodControl.value)
      this.periodControl.setValue(periods[0], { emitEvent: true });
    setTimeout(() => {
      this.periodAutocomplete()?.options.find((option) => option.value === this.periodControl.value)?.select(true);
      this.cd.detectChanges();
    });
  }

  dateTickFormatting(date: Date): string {
    const timeFormatter = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    });
  
    const dateFormatter = new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: '2-digit'
    });
  
    return date.getHours() === 0 && date.getMinutes() === 0
      ? dateFormatter.format(date)
      : timeFormatter.format(date);
  }
  
  dateFilter(date: Date | null): boolean {
    if (!date)
      return false;

    const today = new Date();
    const minDate = new Date();
    today.setHours(23,59,59,999);
    minDate.setDate(today.getDate() - 7);
    minDate.setHours(0, 0, 0, 0);
    return date >= minDate && date <= today;
  };
}
