# Provisional decisions and improvements

These implementation choices can be revised as consumer needs become clearer. The project brief defines the current HTTP contract.

| Area | Current choice | Why or when to revisit |
| --- | --- | --- |
| Health | Use unversioned GET /health with HTTP 200 and a JSON status of ok after startup. | A minimal liveness response is enough for the initial deployment. |
| Company response | Use the companies row plus an alphabetically sorted array of current ticker strings. | Consumers can discover aliases without repeated CIK values. Revisit if exact table-only output is preferred. |
| Filing responses | Use snake_case database fields and JSON null for an absent report date. Use the same row shape for detail and list items. | This follows the requested initial table mirror. Review before committing to a long-term public format. |
| Filters | Use form, from and to. Match one form exactly. Include both filing-date boundaries and allow either bound alone. | These rules make single-day and open-ended searches predictable. |
| Page size | Use limit with default 25, minimum 1 and maximum 100. Reject values outside the range. | Reassess with real payload sizes. |
| Page shape | Return data and nextCursor. Use null on the last page and an empty array for a known company with zero matches. | Clients can detect completion without requesting an extra page. |
| Cursor | Use an opaque base64url-encoded JSON value containing the last acceptance timestamp and accession number, resolved CIK, and normalized form and date filters. Validate the decoded fields. Allow a different limit on continuation. | This preserves ordering across timestamp ties and detects incompatible filter changes. Encoding provides no integrity guarantee. |
| HTTP errors | Use 400 for invalid query or cursor input and 404 for an unknown resource. Return statusCode and message. | Provides a small error contract for the first consumers. |
| Import refresh | Re-read the full history on each startup. Update validated filings by accession number and retain saved filings absent from a later response. | This applies the full-history requirement without introducing checkpoints. Review startup duration once measured. |
| Storage conventions | Use ten-digit CIK text, uppercase tickers with case-insensitive lookup, UTC timestamps normalized to milliseconds, and accession number descending to break acceptance-time ties. | These preserve identifier formatting and deterministic lookup and pagination. |
| Dependency audit | Treat zero known vulnerabilities across runtime and development dependencies as a pass. Check a candidate lockfile first and audit the applied lockfile again. | Makes the requested package audit and reporting rule reproducible. |
| Runtime and tooling | Target Node 22 LTS with better-sqlite3, Drizzle's migration runner, and a checked-in SQL migration. Use Jest 29.7.0 because the Jest 30.5.2 candidate failed the dependency audit. | Recheck these pins when upgrading. |
| Operations | Listen on port 3000, store SQLite at data/filings.sqlite (override with SQLITE_PATH), and mount /app/data in Compose. Set SEC_USER_AGENT to an application name and monitored contact email. Fetch sequentially with a 150 ms pause and 60 s request timeout. | These defaults make local and container startup reproducible and bound upstream waits. |
| Full-history verification | Some historical filings lack primaryDocument, and four observed accessions appear under two in-scope CIKs. An empty document path maps to SQL and JSON null. Store one row per (company CIK, accession number). | A composite key preserves each company association and its document URL for ticker-scoped requests. |
| API documentation | Serve Swagger UI at /docs and OpenAPI JSON at /docs-json alongside the API. | Consumers can explore and try the public routes using the running service. |
