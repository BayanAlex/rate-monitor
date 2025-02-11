import { environment } from "../../environments/environment";

export const endpoints = {
  login: `${environment.apiUrl}/identity/realms/fintatech/protocol/openid-connect/token`,
  realtime: 'wss://platform.fintacharts.com/api/streaming/ws/v1/realtime',
  getInstruments: `${environment.apiUrl}/api/instruments/v1/instruments`,
  getDateRange: `${environment.apiUrl}/api/bars/v1/bars/date-range`,
}