export interface RealtimeDataDto {
  instrumentId: string;
  provider: string;
  type: string;
  last: {
    change: number;
    changePct: number;
    price: number;
    timestamp: string;
    volume: number;
  }
}

export interface RealtimeSubDto {
  id: string;
  subscribe: boolean;
  instrumentId: string;
  kinds: ('last' | 'bid' | 'ask')[];
  provider: string;
  type: string;
}

export interface RealtimeData {
  price: number,
  timestamp: Date
}