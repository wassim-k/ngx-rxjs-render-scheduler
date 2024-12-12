import { Component, Injector } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { delay, of, throwError, timer, toArray } from 'rxjs';
import { AfterNextRenderScheduler, observeOnNextRender } from './afterNextRenderScheduler';

describe('AfterNextRenderScheduler', () => {
  describe('AfterNextRenderScheduler outside of Component', () => {
    let injector: Injector;

    beforeEach(() => {
      TestBed.configureTestingModule({});
      injector = TestBed.inject(Injector);
    });

    it('should schedule immediate work and execute after next render', fakeAsync(() => {
      const scheduler = new AfterNextRenderScheduler(injector);
      const spy = jest.fn();

      scheduler.schedule(spy, 0, 'testState');

      // Simulate Angular render and stable state
      tick(); // flush microtasks, triggers afterNextRender callback

      expect(spy).toHaveBeenCalledWith('testState');
    }));

    it('should schedule delayed work and execute after the specified delay', fakeAsync(() => {
      const scheduler = new AfterNextRenderScheduler(injector);
      const spy = jest.fn();

      scheduler.schedule(spy, 50, 'delayedState');

      tick(49); // Before delay
      expect(spy).not.toHaveBeenCalled();

      tick(1); // Complete delay
      expect(spy).toHaveBeenCalledWith('delayedState');
    }));

    it('should execute multiple scheduled actions in the order they were added', fakeAsync(() => {
      const scheduler = new AfterNextRenderScheduler(injector);
      const spy1 = jest.fn();
      const spy2 = jest.fn();

      scheduler.schedule(spy1, 0, 'first');
      scheduler.schedule(spy2, 0, 'second');

      tick(); // Flush all tasks

      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();

      // Check call order by examining mock invocation history
      const spy1CallIndex = spy1.mock.invocationCallOrder[0];
      const spy2CallIndex = spy2.mock.invocationCallOrder[0];
      expect(spy1CallIndex).toBeLessThan(spy2CallIndex);
    }));

    it('should handle exceptions in scheduled actions', fakeAsync(() => {
      const spy1 = jest.fn();
      const spy2 = jest.fn();

      throwError(() => new Error('Test Error')).pipe(
        observeOnNextRender(injector)
      ).subscribe({
        next: spy1,
        error: spy2
      });

      tick();

      expect(spy1).not.toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
    }));

    it('should cancel scheduled work if unsubscribed before execution', fakeAsync(() => {
      const scheduler = new AfterNextRenderScheduler(injector);
      const spy = jest.fn();

      const subscription = scheduler.schedule(spy, 0, 'canceledState');
      subscription.unsubscribe();

      tick(); // Flush tasks
      expect(spy).not.toHaveBeenCalled();
    }));

    it('should correctly flush the queue after multiple renders', fakeAsync(() => {
      const scheduler = new AfterNextRenderScheduler(injector);
      const spy1 = jest.fn();
      const spy2 = jest.fn();

      scheduler.schedule(spy1, 0, 'state1');
      tick(); // First render
      expect(spy1).toHaveBeenCalledWith('state1');

      scheduler.schedule(spy2, 0, 'state2');
      tick(); // Second render
      expect(spy2).toHaveBeenCalledWith('state2');
    }));

    it('should respect the delay for actions with mixed immediate and delayed scheduling', fakeAsync(() => {
      const scheduler = new AfterNextRenderScheduler(injector);
      const immediateSpy = jest.fn();
      const delayedSpy = jest.fn();

      scheduler.schedule(immediateSpy, 0, 'immediateState');
      scheduler.schedule(delayedSpy, 100, 'delayedState');

      tick(); // Immediate
      expect(immediateSpy).toHaveBeenCalledWith('immediateState');
      expect(delayedSpy).not.toHaveBeenCalled();

      tick(100); // Delayed
      expect(delayedSpy).toHaveBeenCalledWith('delayedState');
    }));

    it('should handle multiple subscriptions for delayed tasks', fakeAsync(() => {
      const scheduler = new AfterNextRenderScheduler(injector);
      const spy1 = jest.fn();
      const spy2 = jest.fn();

      const subscription1 = scheduler.schedule(spy1, 100, 'state1');
      const subscription2 = scheduler.schedule(spy2, 200, 'state2');

      tick(100);
      expect(spy1).toHaveBeenCalledWith('state1');
      expect(spy2).not.toHaveBeenCalled();

      tick(100); // Remaining delay
      expect(spy2).toHaveBeenCalledWith('state2');

      subscription1.unsubscribe();
      subscription2.unsubscribe();
    }));

    it('should correctly handle an observable with delay', fakeAsync(() => {
      const emittedValues: number[] = [];
      const source$ = of(1, 2, 3).pipe(
        delay(50), // Add a delay of 50ms for each emission
        observeOnNextRender(injector),
        toArray() // Collect all emissions
      );

      source$.subscribe({
        next: (values) => emittedValues.push(...values),
        error: (err) => {
          throw new Error(`Test failed with error: ${err}`);
        },
      });

      // Simulate the passage of time
      tick(49); // Before the delay
      expect(emittedValues).toEqual([]); // No values emitted yet

      tick(1); // Flush the delay
      expect(emittedValues).toEqual([1, 2, 3]); // All values emitted after delay
    }));

    it('should handle multiple delayed observables correctly', fakeAsync(() => {
      const emittedValuesA: number[] = [];
      const emittedValuesB: string[] = [];

      const sourceA$ = of(1, 2, 3).pipe(
        delay(30),
        observeOnNextRender(injector),
        toArray()
      );

      const sourceB$ = of('a', 'b', 'c').pipe(
        delay(50),
        observeOnNextRender(injector),
        toArray()
      );

      sourceA$.subscribe({
        next: (values) => emittedValuesA.push(...values),
        error: (err) => {
          throw new Error(`Source A failed with error: ${err}`);
        },
      });

      sourceB$.subscribe({
        next: (values) => emittedValuesB.push(...values),
        error: (err) => {
          throw new Error(`Source B failed with error: ${err}`);
        },
      });

      // Simulate the passage of time
      tick(29); // Before sourceA delay
      expect(emittedValuesA).toEqual([]);
      expect(emittedValuesB).toEqual([]);

      tick(1); // Flush sourceA delay
      expect(emittedValuesA).toEqual([1, 2, 3]);
      expect(emittedValuesB).toEqual([]);

      tick(20); // Flush sourceB delay
      expect(emittedValuesB).toEqual(['a', 'b', 'c']);
    }));
  });

  describe('AfterNextRenderScheduler in Component Constructor', () => {
    @Component({
      selector: 'app-test-component',
      template: '<div>Test Component</div>'
    })
    class TestComponent {
      public executedState: string | null = null;

      public constructor() {
        timer(0)
          .pipe(observeOnNextRender())
          .subscribe(() => {
            this.executedState = 'constructorState';
          });
      }
    }

    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [TestComponent],
        providers: []
      });
    });

    it('should schedule and execute a task using the context injector', fakeAsync(() => {
      // Create the component
      const fixture = TestBed.createComponent(TestComponent);
      const componentInstance = fixture.componentInstance;

      // No task should execute until Angular's rendering simulation
      expect(componentInstance.executedState).toBeNull();

      // Simulate Angular's rendering and task execution
      tick();

      // Verify the task executed with the expected state
      expect(componentInstance.executedState).toBe('constructorState');
    }));
  });
});
