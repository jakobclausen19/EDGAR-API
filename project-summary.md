## What I built

I built a NestJS API that lets users look up six companies by ticker and browse, filter, and page through their SEC filings. I used Docker and SQLite for simplicity. I used NestJS’s `onModuleInit` hook to run migrations and import EDGAR filings before the API accepts requests. This populates the database on the first run. A Docker volume keeps the data across restarts.

## What I skipped

Some historical EDGAR filings omit the primary document name. I kept those filings and return `null` for `primary_document_url` when the source provides no filename. I wanted to add more tests, add database logging, and replace generic errors with more specific ones.

## What I would do next

I’d run the API in its own container so it could serve historical filings on restart without waiting for another import. A scheduled job would handle EDGAR imports, and a separate migration container would run before either starts.
