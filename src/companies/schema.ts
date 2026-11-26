import { primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const companies = sqliteTable("companies", {
  cik: text().primaryKey(),
  name: text().notNull(),
});
export const tickers = sqliteTable("company_tickers", {
  ticker: text().primaryKey(),
  company_cik: text()
    .notNull()
    .references(() => companies.cik),
});
export const filings = sqliteTable(
  "filings",
  {
    accession_number: text().notNull(),
    company_cik: text()
      .notNull()
      .references(() => companies.cik),
    primary_document_url: text(),
    form_type: text().notNull(),
    filing_date: text().notNull(),
    report_date: text(),
    acceptance_date_time: text().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.company_cik, table.accession_number] }),
  ],
);
export type Filing = typeof filings.$inferSelect;
export type CompanyBatch = {
  cik: string;
  name: string;
  tickers: string[];
  filings: Filing[];
};
