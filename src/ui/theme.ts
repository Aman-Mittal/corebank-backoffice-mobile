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
 * Design tokens. Phase 1 moves these into NativeWind theme variables; screens already read them
 * from here, so that move touches this file and not the screens.
 */
export const colors = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  text: '#111827',
  textMuted: '#4B5563',
  primary: '#1D4ED8',
  onPrimary: '#FFFFFF',
  border: '#D1D5DB',
  warningSurface: '#FFF7E6',
  warningBorder: '#B45309',
  danger: '#B91C1C',
  success: '#15803D',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

/** Smallest touch target, per WCAG 2.5.8 and platform guidelines. */
export const MIN_TOUCH = 44;
