export const marketKinds = ['Forex', 'Stock'] as const;
export type MarketKind = typeof marketKinds[number];

export interface MarketInstrument {
  id: string;
  symbol: string;
  currency: string;
  baseCurrency: string;
  kind: string;
  company?: string;
  markets: string[];
}

export interface MarketSourceDto {
  symbol: string;
  exchange: string;
  defaultOrderSize: number;
  tradingHours: {
    regularStart: string;
    regularEnd: string;
    electronicStart: string;
    electronicEnd: string;
  };
}

export interface MarketInstrumentDto {
  id: string;
  symbol: string;
  kind: string;
  description: string;
  tickSize: number;
  currency: string;
  baseCurrency: string;
  mappings: {
    [key: string]: MarketSourceDto;
  };
  profile: {
    name: string;
    gics: {};
  };
}

export interface MarketInstrumentsResponseDto {
  paging: {
    page: number,
    pages: number,
    items: number
  },
  data: MarketInstrumentDto[]
}