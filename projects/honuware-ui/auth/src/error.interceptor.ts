import { Injectable, Inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ErrorService, ErrorTypes, ProblemDetails } from '@honuware/ui/access';
import { AUTH_ROUTES, AuthRoutes } from './auth-routes';

/**
 * Extended HttpErrorResponse that includes parsed ProblemDetails
 */
export interface ParsedHttpErrorResponse extends HttpErrorResponse {
  problemDetails: ProblemDetails;
}

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private errorService: ErrorService,
    private router: Router,
    @Inject(AUTH_ROUTES) private authRoutes: AuthRoutes
  ) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        const problemDetails = this.errorService.parseError(error);

        // Handle session expired globally - redirect to login
        if (
          problemDetails.type === ErrorTypes.SESSION_EXPIRED ||
          (problemDetails.type === ErrorTypes.NOT_AUTHENTICATED &&
            !this.isAuthEndpoint(request.url))
        ) {
          this.router.navigate([this.authRoutes.loginPath]);
        }

        // Create extended error with parsed problem details
        const parsedError = Object.assign(error, {
          problemDetails,
        }) as ParsedHttpErrorResponse;

        return throwError(() => parsedError);
      })
    );
  }

  private isAuthEndpoint(url: string): boolean {
    const authEndpoints = ['/api/login', '/api/register', '/api/me', '/api/remember'];
    return authEndpoints.some((endpoint) => url.includes(endpoint));
  }
}
