/*
 * @honuware/ui/access
 *
 * The framework server-access seam: the narrow CrudAccess / AuthAccess /
 * PhotoAccess interfaces + injection tokens, the framework DTO types
 * (ColumnDataInfo + JSON conversion, DataResults, DatabaseSchema, TableSchema,
 * ForeignKeyInfo, admin.types, photo.types), the RFC 7807 stack (ApiError +
 * ErrorService), CsrfInterceptor, PhotoUrlBuilder, the request-serializing
 * proxy, and the default HTTP implementations (provideHonuwareAccess).
 */

// Interfaces + request/response types
export * from './crud-access';
export * from './auth-access';
export * from './photo-access';

// Tokens + provider helper
export * from './access-tokens';
export * from './api-base';

// Runtime: proxy, HTTP implementations, services, interceptor
export * from './honuware-access-proxy';
export * from './crud-http-access';
export * from './auth-http-access';
export * from './photo-http-access';
export * from './photo-url-builder';
export * from './error.service';
export * from './csrf.interceptor';
export * from './conversion';

// Framework DTO types
export * from './ColumnDataInfo';
export * from './DataResults';
export * from './DatabaseSchema';
export * from './TableSchema';
export * from './ForeignKeyInfo';
export * from './admin.types';
export * from './photo.types';
export * from './ApiError';
