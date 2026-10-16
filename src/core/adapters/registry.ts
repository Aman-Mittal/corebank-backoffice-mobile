/*
 * Copyright 2026 Aman Mittal
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * The adapter registry: typed tokens, lazily built defaults, and overrides for tests.
 *
 * This is the React-side equivalent of Angular's `InjectionToken` with a `providedIn: 'root'`
 * factory (fineract-backoffice-ui, ADR 0003). The shape is deliberately small: a token names a
 * contract, the registry knows how to build its default implementation, and a test or a mocked
 * build replaces any entry by passing an override. Nothing in a feature constructs an adapter
 * itself, so swapping an implementation is a one-line change in one place.
 */

/** Names a contract. The phantom `T` is what makes `resolve(token)` typed. */
export interface AdapterToken<T> {
  readonly key: symbol;
  /** Never set; carries `T` for inference only. */
  readonly __type?: T;
}

export function token<T>(name: string): AdapterToken<T> {
  return { key: Symbol(name) };
}

/** Builds a default implementation, able to resolve the adapters it depends on. */
export type AdapterFactory<T> = (registry: AdapterRegistry) => T;

/** A token paired with the value that replaces its default. */
export interface AdapterOverride<T = unknown> {
  readonly token: AdapterToken<T>;
  readonly value: T;
}

/** Pairs a token with a value, keeping the two in agreement at compile time. */
export function provide<T>(t: AdapterToken<T>, value: T): AdapterOverride<T> {
  return { token: t, value };
}

export class AdapterRegistry {
  private readonly factories = new Map<symbol, AdapterFactory<unknown>>();
  private readonly instances = new Map<symbol, unknown>();
  private readonly resolving = new Set<symbol>();

  constructor(overrides: readonly AdapterOverride[] = []) {
    for (const o of overrides) this.instances.set(o.token.key, o.value);
  }

  /** Registers the default for a token. An override, if present, still wins. */
  register<T>(t: AdapterToken<T>, factory: AdapterFactory<T>): this {
    this.factories.set(t.key, factory as AdapterFactory<unknown>);
    return this;
  }

  resolve<T>(t: AdapterToken<T>): T {
    if (this.instances.has(t.key)) return this.instances.get(t.key) as T;
    const factory = this.factories.get(t.key);
    if (!factory) {
      throw new Error(`No adapter registered for ${t.key.description ?? 'an unnamed token'}`);
    }
    // A cycle between two defaults would otherwise recurse until the stack goes, with an error
    // that names neither adapter.
    if (this.resolving.has(t.key)) {
      throw new Error(`Circular adapter dependency at ${t.key.description ?? 'an unnamed token'}`);
    }
    this.resolving.add(t.key);
    try {
      const instance = factory(this);
      this.instances.set(t.key, instance);
      return instance as T;
    } finally {
      this.resolving.delete(t.key);
    }
  }
}
