const request = require("supertest");
const { fork } = require("node:child_process");
const { once } = require("node:events");
const path = require("node:path");
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

for (const f of batch.filings)
  f.primary_document_url =
    "https://www.sec.gov/Archives/edgar/data/320193/" +
    f.accession_number.replaceAll("-", "") +
    "/example.htm";
batch.filings[0].primary_document_url = null;
let child, api, rolledBack;
beforeAll(async () => {
  child = fork(path.join(__dirname, "fixture-server.cjs"), [], {
    stdio: ["ignore", "ignore", "inherit", "ipc"],
  });
  const [ready] = await once(child, "message");
  api = request(ready.url);
  rolledBack = ready.rolledBack;
});
afterAll(async () => {
  if (child?.connected) {
    const done = once(child, "exit");
    child.send("close");
    await done;
  }
});
test("public lookup and cursor across tied timestamps", async () => {
  await api.get("/health").expect(200, { status: "ok" });
  await api
    .get("/v1/companies/aapl")
    .expect(200, { cik, name: "Apple", tickers: ["AAPL", "ALIAS"] });
  const first = await api
    .get("/v1/companies/alias/filings?limit=1&form=10-K")
    .expect(200);
  expect(first.body.data).toEqual([batch.filings[1]]);
  await api
    .get("/v1/companies/aapl/filings")
    .query({ form: "10-K", cursor: first.body.nextCursor })
    .expect(200, { data: [batch.filings[0]], nextCursor: null });
  await api
    .get("/v1/companies/aapl/filings")
    .query({ cursor: first.body.nextCursor })
    .expect(400);
  await api.get("/v1/companies/aapl/filings?limit=0").expect(400);
  await api
    .get("/v1/companies/aapl/filings?to=2025-01-01")
    .expect(200, { data: [], nextCursor: null });
  await api
    .get("/v1/companies/alias/filings/" + batch.filings[0].accession_number)
    .expect(200, batch.filings[0]);
  await api
    .get("/v1/companies/meta/filings/" + batch.filings[0].accession_number)
    .expect(200, { ...batch.filings[0], company_cik: "0001326801" });
  await api
    .get("/v1/companies/meta/filings/" + batch.filings[1].accession_number)
    .expect(404);
  await api.get("/v1/companies/missing").expect(404);
});
test("a later failure rolls back earlier writes", () =>
  expect(rolledBack).toBe(true));

test("Swagger UI and OpenAPI describe the public routes", async () => {
  await api
    .get("/docs")
    .expect(200)
    .expect(/Swagger UI/i);
  const { body } = await api.get("/docs-json").expect(200);
  expect(Object.keys(body.paths).sort()).toEqual([
    "/health",
    "/v1/companies/{ticker}",
    "/v1/companies/{ticker}/filings",
    "/v1/companies/{ticker}/filings/{accessionNumber}",
  ]);
  expect(
    body.paths["/v1/companies/{ticker}/filings"].get.parameters
      .map((p) => p.name)
      .sort(),
  ).toEqual(["cursor", "form", "from", "limit", "ticker", "to"]);
});
