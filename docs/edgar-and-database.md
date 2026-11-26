# EDGAR data and SQLite schema

The API serves data from SQLite. EDGAR’s public submissions API supplies the company metadata and filing history. A Central Index Key (CIK) identifies an EDGAR filer. For the six companies in scope, use the ten-digit CIK as the company key and preserve its leading zeros. Several tickers can resolve to one CIK and the same filing history. [SEC CIK lookup](https://www.sec.gov/search-filings/cik-lookup) · [SEC submissions API documentation](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)

## Companies in scope

The names and ticker symbols below were observed in the six submissions responses. Expose all current symbols returned for the six configured CIKs.

| EDGAR name | CIK and submissions response | Observed tickers |
| --- | --- | --- |
| Apple Inc. | [0000320193](https://data.sec.gov/submissions/CIK0000320193.json) | AAPL |
| Meta Platforms, Inc. | [0001326801](https://data.sec.gov/submissions/CIK0001326801.json) | META, METAM |
| Alphabet Inc. | [0001652044](https://data.sec.gov/submissions/CIK0001652044.json) | GOOGL, GOOG, GOOGM, GOOGN |
| AMAZON COM INC | [0001018724](https://data.sec.gov/submissions/CIK0001018724.json) | AMZN |
| NETFLIX INC | [0001065280](https://data.sec.gov/submissions/CIK0001065280.json) | NFLX |
| GOLDMAN SACHS GROUP INC | [0000886982](https://data.sec.gov/submissions/CIK0000886982.json) | GS, GSCE, GS-PA, GS-PC, GS-PD |

## Reading a submissions response

Request `https://data.sec.gov/submissions/CIK##########.json` with the ten-digit CIK. Read `cik`, `name`, and `tickers` from the top level. Under `filings.recent`, each field is an array. Values at the same index describe one filing. All six responses also listed additional history files under `filings.files`. [SEC submissions API documentation](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)

| EDGAR filing field | SQLite column | Mapping |
| --- | --- | --- |
| accessionNumber | accession_number | Preserve the full string, including dashes. |
| primaryDocument | primary_document_url | Map an empty string to NULL. For a supplied path, build the archive URL using the rule below. |
| form | form_type | Preserve the SEC form value, including amendment suffixes. |
| filingDate | filing_date | Store the filing date as YYYY-MM-DD. |
| reportDate | report_date | Store YYYY-MM-DD when present. Map an empty value to NULL, which occurred in all six company histories. |
| acceptanceDateTime | acceptance_date_time | Store the acceptance instant as fixed-width UTC text in YYYY-MM-DDTHH:mm:ss.sssZ format so text order matches time order. |

Build the primary-document link as `https://www.sec.gov/Archives/edgar/data/{unpadded company CIK}/{accession number without dashes}/{primaryDocument}`. Take the company CIK from the submissions response. For example, Meta’s accession number `0001628280-26-003942` uses the archive directory for company CIK `1326801`. [Meta 10-K primary document](https://www.sec.gov/Archives/edgar/data/1326801/000162828026003942/meta-20251231.htm)

## Startup import

The EDGAR adapter runs on every application startup, before the API accepts requests.

1. Open the configured SQLite database, apply pending Drizzle migrations (including on a fresh Docker volume), and verify that the company, ticker, and filing tables are accessible. Complete this check before contacting EDGAR.
2. Fetch one configured CIK at a time. On every startup import its entire available filing history: process every row in `filings.recent` and fetch every additional submissions file named in `filings.files` before moving to the next CIK. Read the historical filing columns directly from each history file and associate them with the parent submissions CIK. Apply the same field mappings and validation to recent and historical rows. Pass each response through the adapter’s translation layer before fetching the next company. Use Zod to validate the required fields, confirm the top-level submissions CIK matches the requested CIK, and verify that the filing columns used by the import have equal lengths. Normalize each record using the mappings above and validate the resulting values. A malformed record fails the entire import.
3. Once the translation layer has approved all six companies, open a single SQLite transaction. Within it, write each company followed by its tickers and filings. Use the documented keys so repeated starts with identical data produce the same rows. Refresh ticker mappings to match the validated current symbols for all six CIKs, removing retired mappings inside the transaction. Upsert filings by company CIK and accession number and preserve existing filings absent from the incoming batch. Commit only after every company has been written successfully.
4. On a migration, database readiness, fetch, validation, normalization, write, or commit failure, stop startup and emit a critical log entry. Include the failed stage, the CIK when known, and the specific error. For invalid filing data, include the field and the accession number or source row index. Roll back any active transaction and exit with a failure status.

For example, an invalid acceptance timestamp in the sixth company’s response fails validation before any writes begin. A constraint failure while writing that company rolls back the first five companies’ writes as well. In either case the previously committed data stays intact.

## SQLite schema

Keep the three tables together in one removable NestJS feature module with company and filing controllers. Enable SQLite foreign-key enforcement on each database connection.

```sql
CREATE TABLE companies (
  cik TEXT PRIMARY KEY NOT NULL
    CHECK (length(cik) = 10 AND cik NOT GLOB '*[^0-9]*'),
  name TEXT NOT NULL
);

CREATE TABLE company_tickers (
  ticker TEXT COLLATE NOCASE PRIMARY KEY NOT NULL,
  company_cik TEXT NOT NULL REFERENCES companies(cik)
);

CREATE TABLE filings (
  accession_number TEXT NOT NULL,
  company_cik TEXT NOT NULL REFERENCES companies(cik),
  primary_document_url TEXT,
  form_type TEXT NOT NULL,
  filing_date TEXT NOT NULL,
  report_date TEXT,
  acceptance_date_time TEXT NOT NULL,
  PRIMARY KEY (company_cik, accession_number)
);

CREATE INDEX filings_company_acceptance_idx
  ON filings (company_cik, acceptance_date_time DESC, accession_number DESC);

CREATE INDEX filings_company_form_acceptance_idx
  ON filings (company_cik, form_type, acceptance_date_time DESC, accession_number DESC);
```

## Lookup and pagination

Store ticker symbols in uppercase and retain punctuation. The case-insensitive ticker key lets `aapl` and `AAPL` resolve to the same company. Resolve a ticker to its CIK before querying filings. Look up an individual filing by resolved company CIK and accession number.

Filter the list by `filing_date` for date ranges and by `form_type` when supplied. Sort by `acceptance_date_time DESC, accession_number DESC`. The accession number gives filings accepted at the same instant a stable order. Encode both values from the last returned row in the continuation cursor. With the same company and filters, the next page selects rows where `(acceptance_date_time, accession_number) < (?, ?)` using those cursor values in order.
