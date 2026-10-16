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

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithAdapters } from '@/testing/render';

import { TID } from '../../../e2e/shared/testids';
import { SelectField } from './SelectField';

const OPTIONS = [
  { value: 1, label: 'Head Office' },
  { value: 2, label: 'Kampala Branch' },
];

describe('SelectField', () => {
  it('shows the choice, opens a radio group marking it, and reports a new one', async () => {
    const onChange = vi.fn();
    renderWithAdapters(
      <SelectField
        label="Office"
        testID="f"
        options={OPTIONS}
        value={1}
        onChange={onChange}
        placeholder="Choose"
      />,
    );
    const trigger = screen.getByTestId('f');
    expect(trigger).toHaveTextContent('Head Office');
    // The name holds the visible text as well as the label (WCAG 2.5.3).
    expect(trigger).toHaveAccessibleName('Office Head Office');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getByTestId(TID.option('f', 1))).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByTestId(TID.option('f', 2)));
    expect(onChange).toHaveBeenCalledWith(2);
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('disabled, still shows the value and does not open', async () => {
    renderWithAdapters(
      <SelectField
        label="Office"
        testID="f"
        options={OPTIONS}
        value={2}
        placeholder="Choose"
        disabled
      />,
    );
    const trigger = screen.getByTestId('f');
    expect(trigger).toHaveTextContent('Kampala Branch');
    expect(trigger).toHaveAttribute('aria-disabled', 'true');
    // A disabled control does not take pointer events; force the click to prove it stays shut.
    await userEvent.setup({ pointerEventsCheck: 0 }).click(trigger);
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });
});
