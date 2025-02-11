import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { endpoints } from '../models/endpoints.model';

interface TokenResponseDto {
  access_token: string;
  refresh_token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _token = '';
  get token() {
    return this._token;
  }

  private loggedInSubject = new BehaviorSubject(false);
  loggedIn$ = this.loggedInSubject.asObservable();

  constructor(
    private httpClient: HttpClient
  ) { }

  login() {
    const body = new URLSearchParams();
    body.set('grant_type', 'password');
    body.set('client_id', 'app-cli');
    body.set('username', environment.username);
    body.set('password', environment.password);

    return this.httpClient
      .post<TokenResponseDto>(endpoints.login,
        body.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': '*/*',
          }
        }
      ).pipe(
        map((response) => {
          this._token = response.access_token;
          this.loggedInSubject.next(true);
        })
      );
  }

  logout() {
    this._token = '';
    this.loggedInSubject.next(false);
  }

}
