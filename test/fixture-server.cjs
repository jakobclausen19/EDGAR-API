const { createApp } = require("../dist/main");
const {
  CompaniesRepository,
} = require("../dist/companies/companies.repository");
const cik = "0000320193";
const batch = {
  cik,
  name: "Apple",
  tickers: ["AAPL", "ALIAS"],
  filings: [1, 2].map((i) => ({
    accession_number: "0000320193-26-00000" + i,
    company_cik: cik,
    form_type: "10-K",
    filing_date: "2026-01-01",
    report_date: null,
    acceptance_date_time: "2026-01-01T12:00:00.000Z",
    primary_document_url: "https://www.sec.gov/example.htm",
  })),
};

process.env.SQLITE_PATH = ":memory:";
process.env.SEC_USER_AGENT = "Fixture";
global.fetch = async (url) => {
  const cik = url.match(/CIK(\d{10})/)[1];
  const apple = cik === batch.cik;
  const rows = apple
    ? batch.filings
    : cik === "0001326801"
      ? batch.filings.slice(0, 1)
      : [];
  const recent = {
    accessionNumber: rows.map((f) => f.accession_number),
    form: rows.map((f) => f.form_type),
    filingDate: rows.map((f) => f.filing_date),
    reportDate: rows.map(() => ""),
    acceptanceDateTime: rows.map((f) => f.acceptance_date_time),
    primaryDocument: rows.map((_, i) => (i === 0 ? "" : "example.htm")),
  };
  return Response.json({
    cik,
    name: apple ? "Apple" : cik,
    tickers: apple ? batch.tickers : cik === "0001326801" ? ["META"] : [cik],
    filings: { recent, files: [] },
  });
};
(async () => {
  const app = await createApp();
  const repo = app.get(CompaniesRepository);
  let rolledBack = false;
  try {
    repo.save([
      { ...batch, name: "Changed" },
      { ...batch, cik: "0000000002" },
    ]);
  } catch {
    rolledBack = repo.company("AAPL").name === "Apple";
  }
  await app.listen(0, "127.0.0.1");
  process.send({ url: await app.getUrl(), rolledBack });
  process.once("message", async () => {
    await app.close();
    process.disconnect();
  });
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
