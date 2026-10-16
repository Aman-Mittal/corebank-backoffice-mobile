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

import { AdapterRegistry, provide, token } from './registry';

interface Greeter {
  greet(): string;
}
const GREETER = token<Greeter>('Greeter');
const NAME = token<string>('Name');

describe('AdapterRegistry', () => {
  it('builds a default once and returns the same instance after', () => {
    let built = 0;
    const r = new AdapterRegistry().register(GREETER, () => {
      built += 1;
      return { greet: () => 'hi' };
    });
    expect(r.resolve(GREETER)).toBe(r.resolve(GREETER));
    expect(built).toBe(1);
  });

  it('lets an override win over the registered default', () => {
    const r = new AdapterRegistry([provide(GREETER, { greet: () => 'fake' })]).register(
      GREETER,
      () => ({ greet: () => 'real' }),
    );
    expect(r.resolve(GREETER).greet()).toBe('fake');
  });

  it('resolves dependencies between defaults', () => {
    const r = new AdapterRegistry()
      .register(NAME, () => 'Ada')
      .register(GREETER, (reg) => ({ greet: () => `hi ${reg.resolve(NAME)}` }));
    expect(r.resolve(GREETER).greet()).toBe('hi Ada');
  });

  it('names the token when nothing is registered', () => {
    expect(() => new AdapterRegistry().resolve(GREETER)).toThrow(/Greeter/);
  });

  it('reports a cycle instead of overflowing the stack', () => {
    const A = token<number>('A');
    const B = token<number>('B');
    const r = new AdapterRegistry()
      .register(A, (reg) => reg.resolve(B))
      .register(B, (reg) => reg.resolve(A));
    expect(() => r.resolve(A)).toThrow(/Circular adapter dependency/);
  });
});
