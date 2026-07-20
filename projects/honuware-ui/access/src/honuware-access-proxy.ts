import { Injectable } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';

import { CrudAccess, AddItemBody, UpdateItemBody } from './crud-access';
import { AuthAccess, LoginInfo, UserInfo, SetUserInfo, UpdateUserPasswordInfo } from './auth-access';
import { PhotoAccess } from './photo-access';
import { DataResults, DataResultsWithCount } from './DataResults';
import { DatabaseSchema } from './DatabaseSchema';
import { FilterPair, FkOptionsResponse, FkDisplayResponse } from './admin.types';
import { SourcePhotoInfo } from './photo.types';
import { CrudHttpAccess } from './crud-http-access';
import { AuthHttpAccess } from './auth-http-access';
import { PhotoHttpAccess } from './photo-http-access';

// Request-serializing façade over the default HTTP implementations. A honuware
// server allows one transaction per session and rejects concurrent requests,
// so every call is queued and run one at a time (the library twin of the app's
// ServerAccessProxy). This is the default a new consumer gets via
// provideHonuwareAccess({ mode: 'http' }); knottyyoga wires its own proxy.
@Injectable({ providedIn: 'root' })
export class HonuwareAccessProxy implements CrudAccess, AuthAccess, PhotoAccess {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private queue: { factory: () => Observable<any>; subscriber: Subscriber<any> }[] = [];
  private busy = false;

  constructor(
    private crud: CrudHttpAccess,
    private auth: AuthHttpAccess,
    private photo: PhotoHttpAccess,
  ) {}

  private serialize<T>(factory: () => Observable<T>): Observable<T> {
    return new Observable<T>((subscriber) => {
      this.queue.push({ factory, subscriber });
      this.pump();
    });
  }

  private pump(): void {
    if (this.busy) return;
    const next = this.queue.shift();
    if (!next) return;
    this.busy = true;
    next.factory().subscribe({
      next: (value) => next.subscriber.next(value),
      error: (err) => { next.subscriber.error(err); this.busy = false; this.pump(); },
      complete: () => { next.subscriber.complete(); this.busy = false; this.pump(); },
    });
  }

  // --- CrudAccess ---
  addItem(body: AddItemBody): Observable<void> { return this.serialize(() => this.crud.addItem(body)); }
  addItemFetchPrimaryKey(body: AddItemBody): Observable<string> { return this.serialize(() => this.crud.addItemFetchPrimaryKey(body)); }
  getTableRows(tableName: string): Observable<DataResults> { return this.serialize(() => this.crud.getTableRows(tableName)); }
  getRowsByColumn(t: string, c: string, a: boolean, s: number, p: number): Observable<DataResultsWithCount> { return this.serialize(() => this.crud.getRowsByColumn(t, c, a, s, p)); }
  getFilteredTableRows(t: string, c: string, a: boolean, s: number, p: number, f: FilterPair[]): Observable<DataResultsWithCount> { return this.serialize(() => this.crud.getFilteredTableRows(t, c, a, s, p, f)); }
  getRow(t: string, c: string, v: string): Observable<DataResults> { return this.serialize(() => this.crud.getRow(t, c, v)); }
  getRowByValues(t: string, f: FilterPair[]): Observable<DataResults> { return this.serialize(() => this.crud.getRowByValues(t, f)); }
  updateItem(body: UpdateItemBody): Observable<void> { return this.serialize(() => this.crud.updateItem(body)); }
  deleteItem(t: string, c: string, v: string): Observable<void> { return this.serialize(() => this.crud.deleteItem(t, c, v)); }
  getDbSchema(): Observable<DatabaseSchema> { return this.serialize(() => this.crud.getDbSchema()); }
  getFkOptions(t: string, s: string, p: number): Observable<FkOptionsResponse> { return this.serialize(() => this.crud.getFkOptions(t, s, p)); }
  resolveFkDisplay(t: string, v: string[]): Observable<FkDisplayResponse> { return this.serialize(() => this.crud.resolveFkDisplay(t, v)); }

  // --- AuthAccess ---
  register(f: string, l: string, e: string, p: string): Observable<void> { return this.serialize(() => this.auth.register(f, l, e, p)); }
  verify(email: string, secret: string): Observable<void> { return this.serialize(() => this.auth.verify(email, secret)); }
  login(loginInfo: LoginInfo): Observable<void> { return this.serialize(() => this.auth.login(loginInfo)); }
  logout(): Observable<void> { return this.serialize(() => this.auth.logout()); }
  me(): Observable<void> { return this.serialize(() => this.auth.me()); }
  remember(): Observable<void> { return this.serialize(() => this.auth.remember()); }
  getUserInfo(): Observable<UserInfo> { return this.serialize(() => this.auth.getUserInfo()); }
  setUserInfo(userInfo: SetUserInfo): Observable<void> { return this.serialize(() => this.auth.setUserInfo(userInfo)); }
  updateUserPassword(passwordInfo: UpdateUserPasswordInfo): Observable<void> { return this.serialize(() => this.auth.updateUserPassword(passwordInfo)); }

  // --- PhotoAccess ---
  uploadPhoto(t: string, id: number, data: ArrayBuffer, type: string): Observable<SourcePhotoInfo> { return this.serialize(() => this.photo.uploadPhoto(t, id, data, type)); }
  uploadUserPhoto(data: ArrayBuffer, type: string): Observable<SourcePhotoInfo> { return this.serialize(() => this.photo.uploadUserPhoto(data, type)); }
  deletePhoto(t: string, id: number): Observable<void> { return this.serialize(() => this.photo.deletePhoto(t, id)); }
  hasPhoto(t: string, id: number): Observable<{ has_photo: boolean }> { return this.serialize(() => this.photo.hasPhoto(t, id)); }
}
