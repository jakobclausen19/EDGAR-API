CREATE TABLE filings_new (
  accession_number TEXT PRIMARY KEY NOT NULL,
  company_cik TEXT NOT NULL REFERENCES companies(cik),
  primary_document_url TEXT,
  form_type TEXT NOT NULL,
  filing_date TEXT NOT NULL,
  report_date TEXT,
  acceptance_date_time TEXT NOT NULL
);
--> statement-breakpoint
INSERT INTO filings_new SELECT accession_number, company_cik, NULLIF(primary_document_url, ''), form_type, filing_date, report_date, acceptance_date_time FROM filings;
--> statement-breakpoint
DROP TABLE filings;
--> statement-breakpoint
ALTER TABLE filings_new RENAME TO filings;
--> statement-breakpoint
CREATE INDEX filings_company_acceptance_idx
  ON filings (company_cik, acceptance_date_time DESC, accession_number DESC);
--> statement-breakpoint
CREATE INDEX filings_company_form_acceptance_idx
  ON filings (company_cik, form_type, acceptance_date_time DESC, accession_number DESC);
