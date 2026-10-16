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

import type { Href } from 'expo-router';

/**
 * A path built at run time (`/organization/offices/${id}`) as an Expo Router `Href`. Typed
 * routes cannot check a dynamic segment, so the cast lives here once instead of at every call.
 */
export const href = (path: `/${string}`): Href => path as Href;
