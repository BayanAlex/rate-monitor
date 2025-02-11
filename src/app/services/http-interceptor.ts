import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpHandler, HttpRequest } from '@angular/common/http';
import { AuthService } from './auth-service';

@Injectable()
export class HttpRequestInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler) {
    if (request.url.includes('/identity'))
      return next.handle(request);
    
    const authToken = `Bearer ${this.authService.token}`;
    const httpRequest = request.clone({
      headers: request.headers.set('authorization', authToken)
    });
    return next.handle(httpRequest);
  }
}
