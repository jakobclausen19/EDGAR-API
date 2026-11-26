# Public API for companies and filings

Consumers can look up a company by stock ticker, browse its filings, and retrieve an individual filing. All four endpoints are public and require no authentication. EDGAR is the upstream data source. The three consumer endpoints serve requests by reading stored EDGAR data directly from SQLite through Drizzle.

## Endpoints

| Method and path | Purpose |
| --- | --- |
| `GET /health` | Check whether the API is running. |
| `GET /v1/companies/:ticker` | Look up a company by its stock ticker. |
| `GET /v1/companies/:ticker/filings` | List filings for the company identified by its stock ticker. |
| `GET /v1/companies/:ticker/filings/:accessionNumber` | Fetch a filing in this company’s history by accession number. |

The filings list returns the newest filings first. Consumers can filter by form type (for example, `10-K` or `8-K`) and by filing date range, including using both filters together. The endpoint uses cursor-based pagination. Consumers use the continuation cursor to request the next page with the same filters and ordering.

## Initial HTTP contract

Successful requests return HTTP 200 and JSON. Company lookup returns the matching companies row (`cik`, `name`) plus `tickers`, an array of all its current ticker strings sorted alphabetically. Filing lookup returns one filings row with the documented SQLite column names and values. Filing-list items use that same shape, including a JSON null for a missing report date or primary document URL. Health returns `{"status":"ok"}` once startup has completed.

The filings list accepts optional `form` (one exact form type), `from` and `to` (inclusive filing dates in YYYY-MM-DD format), `limit` (integer from 1 to 100, default 25), and `cursor`. Either date bound can be supplied alone. Return `{"data":[],"nextCursor":null}` for a known company with no matching filings. On any page, return a continuation cursor only when another matching row exists.

Treat cursors as opaque. A cursor continues the same company, form filter and date range, ordered by acceptance time and accession number as specified in the [database schema](edgar-and-database.md). Return HTTP 400 for invalid query values, reversed date ranges, malformed cursors or cursor context mismatches. Return HTTP 404 for an unknown ticker or accession number. Error bodies contain a numeric `statusCode` and a string `message`.

See the [decision log](improvments.md) for provisional API defaults and the [startup import](edgar-and-database.md#startup-import) for how the database is populated.

## Technology choices

| Concern | Choice |
| --- | --- |
| Runtime | Node.js LTS |
| Framework and language | NestJS with TypeScript strict mode enabled |
| Package manager | npm |
| Persistence | SQLite with Drizzle ORM |
| Input validation | Zod |
| Linting and formatting | ESLint and Prettier |
| Testing | Jest for tests and Supertest for HTTP assertions |
| Deployment | Run the API in Docker and provide a Docker Compose file. Persist the SQLite database across container replacements. |

## Module boundaries

Organize source code by domain. Each feature module owns its HTTP routes, validation, business logic, database schema and queries. Removing a feature and its application-level registration must leave every other feature usable without edits. Keep feature-specific imports, database relationships and validation rules inside the owning module.

For example, a companies feature could have this layout. Create files as their responsibilities arise.

~~~text
src/companies/
  companies.module.ts
  companies.controller.ts
  companies.service.ts
  companies.repository.ts
  dtos/
  pipes/
~~~

Use a single `src/common/` directory for domain-independent concerns such as shared errors and exception handling. Keep the health check independent of business features. Introduce abstractions when a concrete requirement calls for them.

## Running the API

Use Node 22 LTS for local development. Set `SEC_USER_AGENT` to your application name and monitored contact email before starting the service. From the repository root, run `npm ci`, `npm run build`, then `npm start`. For Docker, set the same environment variable and run `docker compose up --build`. The service listens on port 3000 after a successful full-history import.

Run `npm test` for fixture-backed integration tests and `npm run lint` for the TypeScript lint checks. The tests use an in-memory SQLite database. The [decision log](improvments.md) records the live historical data issues discovered during implementation.
