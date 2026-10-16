-- Licensed to the Apache Software Foundation (ASF) under one
-- or more contributor license agreements.  See the NOTICE file
-- distributed with this work for additional information
-- regarding copyright ownership.  The ASF licenses this file
-- to you under the Apache License, Version 2.0 (the
-- "License"); you may not use this file except in compliance
-- with the License.  You may obtain a copy of the License at
--
--   http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing,
-- software distributed under the License is distributed on an
-- "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
-- KIND, either express or implied.  See the License for the
-- specific language governing permissions and limitations
-- under the License.

-- Create Fineract databases required for multi-tenancy.
--
-- CREATE DATABASE cannot take IF NOT EXISTS, and the compose stack keeps its data
-- in a named volume, so re-running this against a stack that was brought up before
-- would abort on "database already exists" and take the whole bring-up with it.
-- \gexec runs the generated CREATE only when the row is actually missing, which
-- makes `docker compose up` repeatable without a `down -v` and the 60-90s Liquibase
-- migration that would follow it.
SELECT 'CREATE DATABASE fineract_tenants'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fineract_tenants')\gexec
SELECT 'CREATE DATABASE fineract_default'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fineract_default')\gexec

GRANT ALL PRIVILEGES ON DATABASE fineract_tenants TO postgres;
GRANT ALL PRIVILEGES ON DATABASE fineract_default TO postgres;
