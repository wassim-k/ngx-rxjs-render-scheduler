# ngx-rxjs-render-scheduler

A library designed to facilitate scheduling tasks to be executed after the next rendering cycle in Angular applications. It leverages Angular's `afterNextRender` API and integrates seamlessly with RxJS to allow developers to schedule work efficiently and with minimal overhead.

## Features

- **Task Scheduling**: Schedule tasks for execution after the next rendering cycle.
- **RxJS Compatibility**: Easily integrate with RxJS using operators like `observeOn`.
- **Injection Context Support**: Works with Angular's dependency injection system to ensure proper context.

---

## Installation

To install the library, run:

```bash
npm install ngx-rxjs-render-scheduler
```

---

## Usage

### Basic Example

You can use the scheduler with RxJS to schedule observable emissions after the next render. If no injector is passed, it will attempt to use the context injector:

```typescript
import { Injector } from '@angular/core';
import { observeOnNextRender } from 'ngx-rxjs-render-scheduler';
import { of } from 'rxjs';

@Component({
  ...
})
export class RxjsExampleComponent {
  constructor() {
    of(1, 2, 3)
      .pipe(observeOnNextRender())
      .subscribe((value) => {
        console.log('Value emitted after next render:', value);
      });
  }
}
```

---

### Dependency Injection and Context Handling

```typescript
import { Component, Injector, OnInit } from '@angular/core';
import { observeOnNextRender } from 'ngx-rxjs-render-scheduler';

@Component({
  ...
})
export class NgOnInitExampleComponent implements OnInit {
  constructor(private injector: Injector) {}

  ngOnInit(): void {
    of(1, 2, 3)
      .pipe(observeOnNextRender(this.injector)) // <== injector is required outside of injection context.
      .subscribe((value) => {
        console.log('Value emitted after next render:', value);
      });
  }
}
```

---

## API Reference

### `observeOnNextRender(injector | options)` | `new AfterNextRenderScheduler(injector | options)`

- **`options`**:
  - `injector?: Injector`: Angular injector for the context.
  - `now?: () => number`: Custom `now` function for the scheduler.

---

## License

This library is licensed under the MIT License.
