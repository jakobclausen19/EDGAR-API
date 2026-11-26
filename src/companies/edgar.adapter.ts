import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { setTimeout as delay } from "node:timers/promises";
import { CompanyBatch, Filing } from "./schema";

const ciks = [
  "0000320193",
  "0001326801",
  "0001652044",
  "0001018724",
  "0001065280",
  "0000886982",
];
const nonempty = z.string().trim().min(1);
const columns = z.object({
  accessionNumber: z.array(z.string()),
  form: z.array(z.string()),
  filingDate: z.array(z.string()),
  reportDate: z.array(z.string()),
  acceptanceDateTime: z.array(z.string()),
  primaryDocument: z.array(z.string()),
});
const submission = z.object({
  cik: z.string(),
  name: nonempty,
  tickers: z.array(nonempty),
  filings: z.object({
    recent: columns,
    files: z.array(
      z.object({ name: z.string().regex(/^CIK\d{10}-submissions-\d+\.json$/) }),
    ),
  }),
});
const row = z.object({
  accession_number: z.string().regex(/^\d{10}-\d{2}-\d{6}$/),
  form_type: nonempty,
  filing_date: z.iso.date(),
  report_date: z.iso.date().nullable(),
  acceptance_date_time: z.iso
    .datetime({ offset: true })
    .transform((value) => new Date(value).toISOString()),
  document: nonempty
    .refine(
      (path) =>
        path
          .split("/")
          .every(
            (part) =>
              /^[A-Za-z0-9_.-]+$/.test(part) && part !== "." && part !== "..",
          ),
      "Invalid archive document path",
    )
    .nullable(),
});
function translate(
  cik: string,
  input: z.infer<typeof columns>,
  source: string,
): Filing[] {
  const length = input.accessionNumber.length;
  for (const [key, values] of Object.entries(input))
    if (values.length !== length)
      throw new Error(source + " mismatched array length: " + key);
  return input.accessionNumber.map((number, i) => {
    const result = row.safeParse({
      accession_number: number,
      form_type: input.form[i],
      filing_date: input.filingDate[i],
      report_date: input.reportDate[i] === "" ? null : input.reportDate[i],
      acceptance_date_time: input.acceptanceDateTime[i],
      document:
        input.primaryDocument[i] === "" ? null : input.primaryDocument[i],
    });
    if (!result.success)
      throw new Error(
        source +
          " row " +
          i +
          " accession " +
          number +
          " " +
          result.error.message,
      );
    const { document, ...fields } = result.data;
    return {
      ...fields,
      company_cik: cik,
      primary_document_url:
        document === null
          ? null
          : "https://www.sec.gov/Archives/edgar/data/" +
            Number(cik) +
            "/" +
            number.replaceAll("-", "") +
            "/" +
            document,
    };
  });
}
@Injectable()
export class EdgarAdapter {
  private async fetchFile(file: string) {
    const agent = process.env.SEC_USER_AGENT?.trim();
    if (!agent)
      throw new Error(
        "Set SEC_USER_AGENT to the application name and contact email",
      );
    await delay(150);
    const response = await fetch("https://data.sec.gov/submissions/" + file, {
      headers: { "User-Agent": agent, Accept: "application/json" },
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) throw new Error(file + " HTTP " + response.status);
    return response.json() as Promise<unknown>;
  }
  async load(): Promise<CompanyBatch[]> {
    const batches: CompanyBatch[] = [];
    for (const cik of ciks) {
      try {
        const header = submission.parse(
          await this.fetchFile("CIK" + cik + ".json"),
        );
        if (header.cik !== cik)
          throw new Error("Unexpected response CIK " + header.cik);
        const records = translate(cik, header.filings.recent, "recent");
        for (const { name } of header.filings.files) {
          if (!name.startsWith("CIK" + cik + "-"))
            throw new Error("Unexpected archive " + name);
          records.push(
            ...translate(cik, columns.parse(await this.fetchFile(name)), name),
          );
        }
        batches.push({
          cik,
          name: header.name,
          tickers: header.tickers.map((t) => t.toUpperCase()),
          filings: records,
        });
      } catch (error) {
        throw new Error("Fetch/translate CIK " + cik + ": " + String(error));
      }
    }
    return batches;
  }
}
