# EDGAR public API

Look up Apple, Meta, Alphabet, Amazon, Netflix, and Goldman Sachs by stock ticker and browse their SEC filings. The service imports EDGAR data into SQLite and serves JSON over HTTP. All endpoints allow anonymous access.

A shared accession can appear in multiple company histories. Use the company ticker and accession number together to retrieve that company’s filing row.

## Run the tests locally

From the repository root, use Node.js 22.x and npm. The integration tests build the app and exercise its HTTP endpoints against an in-memory SQLite database using SEC fixtures.

```sh
npm ci
npm test
```

## Start the service

**With Docker Compose**, start Docker and make sure port 3000 is available. The first build needs internet access to download the image and packages. Every startup needs HTTPS access to `data.sec.gov` to import the filing histories. Run this from the repository root:

```sh
docker compose up --build
```

Wait for `API is ready` in the logs before opening Swagger or running the examples below. The API starts listening after the import completes.

During startup, the service sends `SEC_USER_AGENT` in the HTTP `User-Agent` header on each request to EDGAR. It identifies the application and gives the SEC an email address to contact about its traffic.

Compose uses the placeholder `EDGAR API contact@example.com` by default. To supply your own details, copy [.env.example](.env.example) to `.env` in the repository root and replace the example email with a monitored address before starting Compose. You can also export `SEC_USER_AGENT` in your shell.

Run `docker compose down` to stop and remove the container. The named volume retains the database under `/app/data`.

## Interactive API documentation

After successful startup, open [Swagger UI](http://localhost:3000/docs) to explore the four routes and send requests. The [OpenAPI JSON](http://localhost:3000/docs-json) is also available.

## Query the API

After a successful startup, run these examples from a second terminal. A healthy service returns `{"status":"ok"}`.

```sh
base=http://localhost:3000
curl "$base/health"
curl "$base/v1/companies/AAPL"
curl "$base/v1/companies/AAPL/filings?form=10-K&from=2025-01-01&to=2025-12-31&limit=10"
curl "$base/v1/companies/META/filings/0001628280-26-003942"
```

The company lookup accepts case-insensitive tickers and returns the CIK, name, and ticker aliases. The filings list returns a `data` array ordered by acceptance time, newest first. Use any returned `accession_number` for the single-filing lookup.

| Optional list parameter | Meaning                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `form`                  | One exact form type, such as `10-K` or `8-K`.                                                                         |
| `from`, `to`            | Inclusive filing dates in YYYY-MM-DD format. Either bound can be used alone.                                          |
| `limit`                 | Page size from 1 to 100, default 25.                                                                                  |
| `cursor`                | Pass the previous response’s `nextCursor` with the same company and filters. A null `nextCursor` marks the last page. |

Invalid filters or cursors return HTTP 400. Unknown tickers and accession numbers return HTTP 404. For response fields and database mappings, see the [API contract](docs/project.md) and [EDGAR schema](docs/edgar-and-database.md).
