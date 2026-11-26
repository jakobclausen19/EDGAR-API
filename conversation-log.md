# Building a public EDGAR API — conversation log

The exchanges are in chronological order. User messages are lightly edited for readability. Long error logs are condensed to the question they prompted. Assistant replies summarize the discussion and the work reported at the time.

## 1. Start with the project brief

**User** — I want to start a small project that could be deployed as a public API for real consumers. Before we write any code, let's work on Markdown files describing what we're trying to achieve. I want NestJS with strict TypeScript, npm, SQLite, Node LTS, Drizzle, Zod, ESLint, Prettier, Jest, Supertest, Docker, and Docker Compose. Before adding packages, verify stable versions, audit the dependencies, and tell me whether they pass or fail. Organize the project into removable domain modules, keep shared errors and exception handling in one common directory, and add a health check. Keep agent documentation in docs, except possibly AGENTS.md. Avoid unnecessary abstractions. Ask if you have thoughts or questions.

**Assistant** — Created the project brief and agent instructions. Treated “companies” as an example until the business domain was confirmed. Asked, “Who is the first consumer you have in mind, and what should they be able to do with one API request?”

## 2. Define what consumers can do

**User** — We're building a public API with no authentication. There should be four endpoints: a health check, company lookup by stock ticker, a company's filings, and a single filing by accession number. The customer endpoints should read directly from SQLite. The data comes from EDGAR. List the newest filings first, support form and date filters, and use cursor-based pagination. We'll look at response data, database structure, and importing EDGAR data in a later session.

**Assistant** — Updated the brief with the four operations. Chose the health-check path and used the plural “filings” from the route list. Left the response format and import design open for discussion.

## 3. Investigate EDGAR before documenting it

**User** — I think the CIK is the unique ID for each company. Please verify this. We're interested only in Apple, Meta, Alphabet, Amazon, Netflix, and Goldman Sachs. Find their tickers and CIKs, check whether a company can have multiple tickers, and inspect each company's submissions response. For filings, we need the accession number, primary document link, form type, filing date, and report date. Report back before writing to Markdown.

**Assistant** — Confirmed that a CIK identifies an EDGAR filer. The six companies had six distinct CIKs, while Meta, Alphabet, and Goldman Sachs each had multiple listed symbols. Found that the submissions responses kept older history in separate files and sometimes supplied an empty report date. Explained how to locate the primary document and raised a product question: should the API accept every symbol EDGAR lists for each company, or only selected stock tickers?

## 4. Discuss the database structure

**User** — Perfect! Before writing this into a Markdown file, give me a suggestion for the database table structure.

**Assistant** — Suggested separate tables for companies, ticker aliases, and filings. Used CIK for company identity and initially proposed accession number alone for filing identity. Asked what “newest first” should mean when several filings have the same filing date. Suggested retaining the SEC acceptance timestamp to distinguish them.

## 5. Approve the schema and filing order

**User** — Perfect! Use this structure and also add acceptanceDateTime. Add the EDGAR information and database structure into a Markdown file.

**Assistant** — Documented the research and agreed schema. Filing lists would use acceptance time for ordering and filing date for date-range searches. Accession number would give equally timed filings a stable order across pages.

## 6. Agree on startup and failure behavior

**User** — Have an EDGAR adapter run on startup. First verify the database is started. Fetch each company one by one, validate and normalize the data, then add it using a transaction. Either all data validates and normalizes or we fail and log a critical warning. Don't overwrite saved data with bad data. The translation layer is where we approve it. Add this to the Markdown file.

**Assistant** — Documented a single transaction for the entire six-company import. Explained that even a failure on the sixth company would preserve the previously committed data. The API would begin accepting requests only after a successful import.

## 7. Review the plan before implementation

**User** — Before we start implementation, validate the Markdown files. Do you have any thoughts or questions about the documentation? Don't add anything yet. Just review and report back.

**Assistant** — Reviewed the documents and raised four points:

1. Should startup create or migrate the tables before checking a fresh database?
2. Should the import include recent filings only, or the full history?
3. Should every current SEC ticker work, and should retired ticker mappings be removed?
4. What should responses, page sizes, filters, cursors, and errors look like?

The assistant suggested a recent-history first release and pointed out that the agreed fail-hard behavior would keep the service offline during a restart if EDGAR were unavailable.

## 8. Resolve the review questions

**User** — 1. Yes, add this. 2. Add all data. 3. Yes. 4. For now, responses can mirror what's in the tables. I'll alter them later. Choose basic values for page size, cursors, and so on. Put these and any decisions you make on your own in a new improvments.md file so I can see them. Update the Markdown files now.

**Assistant** — Updated the plan to migrate first, import the entire available history, and refresh all current ticker mappings. Chose a default page size of 25, a maximum of 100, inclusive date filters, and a null cursor on the last page. Created the decision log with the requested spelling and added a standing instruction to record future independent design choices.

## 9. Start implementation

**User** — Perfect! Now we'll start with the implementation of this.

**Assistant** — Built the API, import process, database migrations, container setup, and tests. Reported that the first testing dependency set failed its audit and the revised set passed with zero known vulnerabilities. The API passed its fixture-backed checks, but trying the full live history exposed two assumptions that the earlier design had missed.

**Questions raised** — How should the API represent the 661 historical rows with an empty primary-document path? How should it handle the four accession numbers that appeared under two of the selected companies? The assistant suggested allowing a missing link and preserving both company associations. Those decisions remained open at this point.

## 10. Explain how to use the app

**User** — Now add a readme.md on how to use the application and how to start it up.

**Assistant** — Added instructions for local and Docker startup, configuration, tests, and all four operations. The README explained the live-import limitation so someone starting the app could distinguish a data issue from a setup problem.

## 11. Accept empty EDGAR values

**User** — If you look at all data from EDGAR, some data can be missing. It's an empty string. These values need to be optional.

**Assistant** — Updated the importer so empty document paths and report dates appear as null in storage and API responses. Added a migration and checked both list and detail responses. The shared-accession question remained open.

## 12. Investigate an Apple filing that still failed

**User** — Apple filing 0000912057-00-024086 is still failing startup with an empty or invalid document error. Can you find it in the data and look at the implementation to see why this fails?

**Assistant** — Confirmed that the filing was a May 2000 Form S-8 with an empty document path. The exited container still had the older validation behavior. Rebuilt the image and verified that the updated app got through validation for all six companies. Startup then stopped during persistence on the separate shared-accession issue.

## 13. Add interactive API documentation

**User** — Perfect! Can you now add Swagger with some basic description?

**Assistant** — Added interactive Swagger documentation and a downloadable OpenAPI description. Documented the four operations, filters, pagination, and error cases. Reported that the new dependency passed its audit and that the documentation worked in integration tests.

## 14. Explain the conflicting company ownership

**User** — Startup fails for Goldman Sachs on accession 0000769993-12-000343. Looks like it's trying to update or add it but complaining that it already exists for a different company. Investigate this.

**Assistant** — Confirmed the user's interpretation. Both Meta and Goldman Sachs listed the same May 2012 Form 4, with the same acceptance time and document path. The first company was inserted earlier in the very same startup transaction, so even an empty database could reproduce the failure. Suggested preserving both associations and explained why ignoring the conflict would lose one company's history.

## 15. Scope filing detail to the company

**User** — Then it makes more sense to have the endpoint under the company ticker, followed by filings and the accession number. Run with this.

**Assistant** — Replaced the standalone filing lookup with a company-scoped lookup. Chose to keep one filing row per company and accession pair, preserving each company's association and document URL. Verified the result with a full live import: startup succeeded, the shared accession was available under both Meta and Goldman Sachs, and Apple correctly returned “not found” for it. Updated the README, Swagger, tests, and design notes.

## 16. Capture the conversation

**User** — Can you generate this chat as a log? Don't include scripts or specific code. I want my input followed by a summary of what you did. The intent is to show our general conversation, the questions you asked, and the answers I gave. Create a Markdown file in this folder.

**Assistant** — Created this chronological log in the project root.
