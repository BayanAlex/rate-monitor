import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth-service';
import { BehaviorSubject, catchError, combineLatest, distinctUntilChanged, filter, map, Observable, of, shareReplay, switchMap } from 'rxjs';
import { MarketInstrument, MarketInstrumentDto, MarketInstrumentsResponseDto, MarketKind } from '../models/instrument.model';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { FormControl, FormGroup } from '@angular/forms';
import { Period } from '../models/chart.model';
import { endpoints } from '../models/endpoints.model';
import { DateRangeData, DateRangeDto } from '../models/date-range.model';
import { RealtimeDataDto, RealtimeSubDto, RealtimeData } from '../models/realtime.mode';

@Injectable({
  providedIn: 'root'
})
export class MarketsService {
  currentInstrumentIdSubject = new BehaviorSubject<string | null>(null);
  waitingForRealtimeSubject = new BehaviorSubject(true);
  realtimeDataSubject = new BehaviorSubject<Observable<RealtimeDataDto | RealtimeSubDto> | null>(null);

  realtimeData$: Observable<RealtimeData | null> = this.realtimeDataSubject.pipe(
    filter((dataObservable) => !!dataObservable),
    switchMap(dataObservable => dataObservable),
    filter((data) => {
      return !!(data as any)?.last && data.instrumentId === this.currentInstrumentIdSubject.value //filter other messages
    }),
    map((data) => {
      this.waitingForRealtimeSubject.next(false);
      const last = (<RealtimeDataDto>data).last;
      return {
        price: last.price as number,
        timestamp: new Date(last.timestamp)
      };
    }),
    shareReplay(1)
  );

  readonly range = new FormGroup({
    start: new FormControl<Date>(new Date()),
    end: new FormControl<Date>(new Date()),
  });
  readonly periodControl = new FormControl<Period | null>(null);

  private socketSubject: WebSocketSubject<RealtimeDataDto | RealtimeSubDto> | null = null;
  private currentMessageId = 1;

  constructor(
    private httpClient: HttpClient,
    private authService: AuthService
  ) {
    this.authService.loggedIn$.subscribe(
      (loggedIn) => {
        if (this.socketSubject)
          this.completeRealtime();

        this.socketSubject = loggedIn
          ? webSocket(`${endpoints.realtime}?token=${this.authService.token}`)
          : null;
        this.realtimeDataSubject.next(this.socketSubject ? this.socketSubject.asObservable() : null);

        if (this.socketSubject && this.currentInstrumentIdSubject.value)
          this.setInstrument(this.currentInstrumentIdSubject.value);
      }
    );
  }

  getInstruments(marketKind: MarketKind): Observable<MarketInstrument[] | null> {
    return this.authService.loggedIn$.pipe(
      distinctUntilChanged(),
      switchMap((loggedIn) => {
        if (!loggedIn)
          return of(null);

        const params = {
          kind: marketKind,
          provider: 'simulation'
        };
        return this.httpClient.get<MarketInstrumentsResponseDto>(endpoints.getInstruments, { params }).pipe(
          catchError((error) => {
            if (error.status !== 401)
              return of(null);
            return this.authService.login().pipe(
              switchMap(() => this.httpClient.get<MarketInstrumentsResponseDto>(endpoints.getInstruments, { params })),
              catchError(() => {
                this.authService.logout();
                return of(null);
              })
            );
          })
        );
      }),
      switchMap((response) => {
        if (!response)
          return of(null);

        const pages = response.paging.pages;
        if (pages <= 1)
          return of(response.data);

        const params = {
          kind: marketKind,
          provider: 'simulation'
        };
        const requests: Observable<MarketInstrumentsResponseDto>[] = [];
        for (let page = 2; page <= pages; page++) {
          requests.push(this.httpClient.get<MarketInstrumentsResponseDto>(endpoints.getInstruments, {
            params: { ...params, page }
          }));
        }

        return combineLatest(requests).pipe(
          map((responses) => {
            const result: MarketInstrumentDto[] = [];
            for (response of responses)
              result.push(...response.data);

            return result;
          })
        );
      }),
      map((response) => {
        if (!response)
          return null;

        return response.map((instrument) => ({
          id: instrument.id,
          symbol: instrument.symbol,
          kind: instrument.kind,
          baseCurrency: instrument.baseCurrency,
          currency: instrument.currency,
          company: instrument.kind === 'stock' ? instrument.profile.name : undefined,
          markets: Object.keys(instrument.mappings)
        }))
      })
    );
  }

  setInstrument(instrumentId: string | null) {
    const nextMessageId = () => (this.currentMessageId++).toString();
    this.waitingForRealtimeSubject.next(true);

    const message: RealtimeSubDto = {
      id: '',
      type: 'l1-subscription',
      instrumentId: instrumentId ?? '',
      provider: 'simulation',
      subscribe: true,
      kinds: ['last']
    };

    if (this.currentInstrumentIdSubject.value)
      this.socketSubject?.next({
        ...message,
        id: nextMessageId(),
        instrumentId: this.currentInstrumentIdSubject.value,
        subscribe: false,
      });

    if (!instrumentId) {
      this.currentInstrumentIdSubject.next(null);
      return;
    }

    this.socketSubject?.next({ ...message, id: nextMessageId() });
    this.currentInstrumentIdSubject.next(instrumentId);
  }

  getDateRange(
    instrumentId: string,
    startDate: Date,
    endDate: Date,
    periodicity: string
  ): Observable<DateRangeData[] | null> {
    return this.authService.loggedIn$.pipe(
      distinctUntilChanged(),
      switchMap((loggedIn) => {
        if (!loggedIn)
          return of(null);

        const params = {
          instrumentId,
          interval: 1,
          periodicity,
          provider:'simulation',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        };
        return this.httpClient.get<DateRangeDto>(endpoints.getDateRange, { params }).pipe(
          catchError((error) => {
            if (error.status !== 401)
              return of(null);
            return this.authService.login().pipe(
              switchMap(() => this.httpClient.get<DateRangeDto>(endpoints.getDateRange, { params })),
              catchError(() => {
                this.authService.logout();
                return of(null);
              })
            );
          }),
          map((response) => response?.data ?? null)
        );
      })
    );
  }

  completeRealtime() {
    this.socketSubject?.complete();
  }
}
