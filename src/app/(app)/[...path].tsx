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

import { usePathname } from 'expo-router';

import { entryFor } from '@/core/navigation/route-access';
import { ModulePlaceholder } from '@/ui/ModulePlaceholder';
import { NotFound } from '@/ui/NotFound';
import { RequireAccess } from '@/ui/RequireAccess';

/**
 * Every signed-in path without a screen of its own: a catalogue module a later phase builds
 * (guarded, then a placeholder naming the phase) or an unknown path. Real screens are added as
 * specific route files, which Expo Router prefers to this one.
 */
export default function ModuleRoute() {
  const entry = entryFor(usePathname());
  if (!entry) return <NotFound />;
  return (
    <RequireAccess access={entry.access}>
      <ModulePlaceholder entry={entry} />
    </RequireAccess>
  );
}
