import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';

import { SquarePaymentService } from './square-payment.service';
import { SQUARE_CONFIG, SquareConfig } from './square-config';

describe('SquarePaymentService', () => {
  const config: SquareConfig = {
    applicationId: 'app-id',
    locationId: 'loc-id',
    scriptUrl: 'https://example.test/square.js',
  };

  // The service manipulates the real window.Square / document.head; snapshot
  // and restore so tests don't leak SDK state into each other.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let originalSquare: any;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    originalSquare = (window as any).Square;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).Square;
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Square = originalSquare;
  });

  it('SQUARE_CONFIG defaults to a benign sandbox placeholder', () => {
    TestBed.configureTestingModule({});
    const cfg = TestBed.inject(SQUARE_CONFIG);
    expect(cfg.scriptUrl).toContain('squarecdn.com');
    expect(cfg.applicationId).toContain('placeholder');
  });

  it('injects SQUARE_CONFIG (no environment import)', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: SQUARE_CONFIG, useValue: config }],
    });
    expect(TestBed.inject(SquarePaymentService)).toBeTruthy();
  });

  it('loads the SDK from the injected scriptUrl and initializes with the injected ids', fakeAsync(() => {
    const service = new SquarePaymentService(config);

    const createdScripts: HTMLScriptElement[] = [];
    const realCreateElement = document.createElement.bind(document);
    spyOn(document, 'createElement').and.callFake((tag: string) => {
      const el = realCreateElement(tag);
      if (tag === 'script') createdScripts.push(el as HTMLScriptElement);
      return el;
    });

    const paymentsSpy = jasmine.createSpy('payments').and.resolveTo({ card: () => ({}) });
    spyOn(document.head, 'appendChild').and.callFake(<T extends Node>(node: T): T => {
      // Simulate the SDK arriving, then fire the script's onload.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).Square = { payments: paymentsSpy };
      Promise.resolve().then(() => (node as unknown as HTMLScriptElement).onload?.(new Event('load')));
      return node;
    });

    let error: unknown;
    service.initialize().catch((e) => (error = e));
    flushMicrotasks();

    expect(error).withContext('initialize should resolve').toBeUndefined();
    expect(createdScripts.length).toBe(1);
    // Script URL selection comes from the injected config, not a hardcoded env.
    expect(createdScripts[0].src).toBe('https://example.test/square.js');
    // application/location ids also flow from the injected config.
    expect(paymentsSpy).toHaveBeenCalledWith('app-id', 'loc-id');
  }));

  it('does not create a second script when the SDK is already present', fakeAsync(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Square = { payments: jasmine.createSpy('payments').and.resolveTo({ card: () => ({}) }) };
    const service = new SquarePaymentService(config);

    const createSpy = spyOn(document, 'createElement').and.callThrough();

    let error: unknown;
    service.initialize().catch((e) => (error = e));
    flushMicrotasks();

    expect(error).toBeUndefined();
    expect(createSpy).not.toHaveBeenCalledWith('script');
  }));
});
