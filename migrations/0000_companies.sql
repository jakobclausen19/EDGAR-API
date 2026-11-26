CREATE TABLE companies (
  cik TEXT PRIMARY KEY NOT NULL
    CHECK (length(cik) = 10 AND cik NOT GLOB '*[^0-9]*'),
  name TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE company_tickers (
  ticker TEXT COLLATE NOCASE PRIMARY KEY NOT NULL,
  company_cik TEXT NOT NULL REFERENCES companies(cik)
);
--> statement-breakpoint
CREATE TABLE filings (
  accession_number TEXT PRIMARY KEY NOT NULL,
  company_cik TEXT NOT NULL REFERENCES companies(cik),
  primary_document_url TEXT NOT NULL,
  form_type TEXT NOT NULL,
  filing_date TEXT NOT NULL,
  report_date TEXT,
  acceptance_date_time TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX filings_company_acceptance_idx
  ON filings (company_cik, acceptance_date_time DESC, accession_number DESC);
--> statement-breakpoint
CREATE INDEX filings_company_form_acceptance_idx
  ON filings (company_cik, form_type, acceptance_date_time DESC, accession_number DESC);
