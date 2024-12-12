import { afterNextRender, inject, Injector } from '@angular/core';
import { MonoTypeOperatorFunction, observeOn, SchedulerAction, SchedulerLike, Subscription } from 'rxjs';

export interface AfterNextRenderSchedulerOptions {
  injector?: Injector;
  now?: () => number;
}

export class AfterNextRenderScheduler implements SchedulerLike {
  public readonly now: () => number;
  private readonly injector?: Injector;

  public constructor(injector?: Injector);
  public constructor(options?: AfterNextRenderSchedulerOptions);
  public constructor(options?: AfterNextRenderSchedulerOptions | Injector);
  public constructor(options?: AfterNextRenderSchedulerOptions | Injector) {
    if (options !== undefined && 'get' in options) {
      this.now = Date.now;
      this.injector = options;
    } else {
      this.now = options?.now ?? Date.now;
      this.injector = options?.injector ?? inject(Injector);
    }
  }

  public schedule<T>(
    work: (this: SchedulerAction<T>, state?: T) => void,
    delay: number = 0,
    state?: T
  ): Subscription {
    return new AfterNextRenderAction<T>(this.injector, work).schedule(state, delay);
  }
}

class AfterNextRenderAction<T> extends Subscription implements SchedulerAction<T> {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  public constructor(
    private readonly injector: Injector | undefined,
    public readonly work: (this: SchedulerAction<T>, state?: T) => void
  ) {
    super();
  }

  public schedule(state?: T, delay: number = 0): Subscription {
    if (this.closed) {
      return this;
    }

    if (delay > 0) {
      this.timeoutId = setTimeout(() => this.schedule(state), delay);
    } else {
      afterNextRender(() => this.execute(state), { injector: this.injector })
    }

    return this;
  }

  public execute(state?: T): void {
    if (this.closed) {
      return;
    }

    try {
      this.work(state);
    } catch (err) {
      this.unsubscribe();
      throw err;
    }
  }

  public override unsubscribe(): void {
    if (this.closed) {
      return;
    }

    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    super.unsubscribe();
  }
}

export function observeOnNextRender<T>(injector?: Injector): MonoTypeOperatorFunction<T>;
export function observeOnNextRender<T>(options?: AfterNextRenderSchedulerOptions): MonoTypeOperatorFunction<T>;
export function observeOnNextRender<T>(options?: AfterNextRenderSchedulerOptions | Injector): MonoTypeOperatorFunction<T> {
  return observeOn(new AfterNextRenderScheduler(options));
}
