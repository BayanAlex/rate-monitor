import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, viewChild } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatAutocomplete, MatAutocompleteModule } from '@angular/material/autocomplete';
import { MarketsService } from '../../services/markets.service';
import { MarketInstrument, MarketKind, marketKinds } from '../../models/instrument.model';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { combineLatest, distinctUntilChanged, map, Observable, of, shareReplay, startWith, switchMap, tap } from 'rxjs';
import { AsyncPipe, DatePipe } from '@angular/common';
import { ChartComponent } from "../chart/chart.component";
import { RealtimeData } from '../../models/realtime.mode';

@Component({
  selector: 'app-rate-widget',
  imports: [
    MatButtonModule,
    MatInputModule,
    MatCardModule,
    MatAutocompleteModule,
    FormsModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    AsyncPipe,
    DatePipe,
    ChartComponent
],
  templateUrl: './rate-widget.component.html',
  styleUrl: './rate-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RateWidgetComponent implements AfterViewInit, OnDestroy {
  marketAutocomplete = viewChild<MatAutocomplete>('marketKindAutocomplete');

  marketKinds = marketKinds;

  instruments$?: Observable<MarketInstrument[] | null>;
  filteredInstruments$?: Observable<MarketInstrument[] | null>;
  currentInstrument$?: Observable<MarketInstrument | null>;
  realtimeData$: Observable<RealtimeData | null>;

  marketKindControl = new FormControl<MarketKind | null>(null);
  instrumentControl = new FormControl<MarketInstrument | string | null>(null);

  constructor(
    private marketsService: MarketsService,
    private cd: ChangeDetectorRef
  ) {
    this.realtimeData$ = combineLatest([
      this.marketsService.realtimeData$,
      this.marketsService.waitingForRealtimeSubject
    ]).pipe(
      map(([data, waiting]) => waiting ? null : data)
    );

    this.instruments$ = this.marketKindControl.valueChanges.pipe(
      distinctUntilChanged(),
      switchMap((marketKind) => marketKind
        ? this.marketsService.getInstruments(marketKind).pipe(startWith(null))
        : of(null)
      ),
      tap(() => {
        this.marketsService.waitingForRealtimeSubject.next(true);
        this.instrumentControl.setValue(null);
        this.setInstrument(null);
      }),
      shareReplay(1),
    );

    this.filteredInstruments$ = combineLatest([
      this.instruments$,
      this.instrumentControl.valueChanges.pipe(
        startWith(null),
        map((value) => {
          if (!value)
            return '';
          return (typeof value === 'string' ? value : value.symbol).toUpperCase();
        })
      )
    ]).pipe(
      map(([instruments, value]) => {
        if (!value)
          return instruments;
        return instruments?.filter(instrument => instrument.symbol.toUpperCase().includes(value)) ?? null;
      })
    );

    this.currentInstrument$ = combineLatest([
      this.instruments$,
      this.marketsService.currentInstrumentIdSubject
    ]).pipe(
      map(([instruments, id]) => {
        if (!id)
          return null;

        return instruments?.find(instrument => instrument.id === id) ?? null;
      }),
      shareReplay(1),
    );
  }

  ngAfterViewInit(): void {
    this.marketKindControl.setValue(marketKinds[0], { emitEvent: true });
    setTimeout(() => {
      this.marketAutocomplete()?.options.first?.select(true);
      this.cd.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.marketsService.completeRealtime();
  }

  setInstrument(instrument: MarketInstrument | null) {
    if (this.marketsService.currentInstrumentIdSubject.value !== instrument?.id)
      this.marketsService.setInstrument(instrument?.id ?? null);
  }

  displayInstrumentFn(instrument: MarketInstrument) {
    return instrument?.symbol ?? '';
  }
}
