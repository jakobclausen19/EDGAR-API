import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { eq, and, gte, lte, desc, asc, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { CompanyDatabase } from "./database";
import { companies, tickers, filings, CompanyBatch } from "./schema";

const querySchema = z.strictObject({
  form: z.string().trim().min(1).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  limit: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().max(100))
    .optional(),
  cursor: z.string().min(1).optional(),
});
const cursorSchema = z.strictObject({
  cik: z.string(),
  form: z.string().nullable(),
  from: z.iso.date().nullable(),
  to: z.iso.date().nullable(),
  time: z.iso.datetime(),
  number: z.string().regex(/^\d{10}-\d{2}-\d{6}$/),
});
@Injectable()
export class CompaniesRepository {
  constructor(private readonly store: CompanyDatabase) {}
  save(batches: CompanyBatch[]) {
    this.store.db.transaction((tx) => {
      tx.delete(tickers)
        .where(
          inArray(
            tickers.company_cik,
            batches.map((b) => b.cik),
          ),
        )
        .run();
      for (const batch of batches) {
        try {
          const { cik, name } = batch;
          tx.insert(companies)
            .values({ cik, name })
            .onConflictDoUpdate({ target: companies.cik, set: { name } })
            .run();
          for (const ticker of batch.tickers)
            tx.insert(tickers).values({ ticker, company_cik: cik }).run();
          for (const filing of batch.filings) {
            const {
              primary_document_url,
              form_type,
              filing_date,
              report_date,
              acceptance_date_time,
            } = filing;
            tx.insert(filings)
              .values(filing)
              .onConflictDoUpdate({
                target: [filings.company_cik, filings.accession_number],
                set: {
                  primary_document_url,
                  form_type,
                  filing_date,
                  report_date,
                  acceptance_date_time,
                },
              })
              .run();
          }
        } catch (error) {
          throw new Error("Persist CIK " + batch.cik + ": " + String(error));
        }
      }
    });
  }
  private lookup(ticker: string) {
    const found = this.store.db
      .select({ cik: companies.cik, name: companies.name })
      .from(tickers)
      .innerJoin(companies, eq(tickers.company_cik, companies.cik))
      .where(eq(tickers.ticker, ticker))
      .get();
    if (!found) throw new NotFoundException("Unknown ticker");
    return found;
  }
  company(ticker: string) {
    const company = this.lookup(ticker);
    const aliases = this.store.db
      .select({ ticker: tickers.ticker })
      .from(tickers)
      .where(eq(tickers.company_cik, company.cik))
      .orderBy(asc(tickers.ticker))
      .all();
    return { ...company, tickers: aliases.map((a) => a.ticker) };
  }
  filing(ticker: string, number: string) {
    const { cik } = this.lookup(ticker);
    const filing = this.store.db
      .select()
      .from(filings)
      .where(
        and(eq(filings.company_cik, cik), eq(filings.accession_number, number)),
      )
      .get();
    if (!filing) throw new NotFoundException("Unknown accession number");
    return filing;
  }
  list(ticker: string, query: unknown) {
    const parsed = querySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException("Invalid filings query");
    const { form, from, to, limit = 25, cursor } = parsed.data;
    if (from && to && from > to)
      throw new BadRequestException("from must precede or equal to");
    const { cik } = this.lookup(ticker);
    const context = {
      cik,
      form: form ?? null,
      from: from ?? null,
      to: to ?? null,
    };
    const conditions = [eq(filings.company_cik, cik)];
    if (form) conditions.push(eq(filings.form_type, form));
    if (from) conditions.push(gte(filings.filing_date, from));
    if (to) conditions.push(lte(filings.filing_date, to));
    if (cursor) {
      try {
        const bytes = Buffer.from(cursor, "base64url");
        if (bytes.toString("base64url") !== cursor) throw new Error();
        const c = cursorSchema.parse(JSON.parse(bytes.toString()));
        if (
          c.cik !== cik ||
          c.form !== context.form ||
          c.from !== context.from ||
          c.to !== context.to
        )
          throw new Error();
        conditions.push(
          sql`(${filings.acceptance_date_time}, ${filings.accession_number}) < (${c.time}, ${c.number})`,
        );
      } catch {
        throw new BadRequestException("Invalid continuation cursor");
      }
    }
    const data = this.store.db
      .select()
      .from(filings)
      .where(and(...conditions))
      .orderBy(
        desc(filings.acceptance_date_time),
        desc(filings.accession_number),
      )
      .limit(limit + 1)
      .all();
    let nextCursor: string | null = null;
    if (data.length > limit) {
      data.pop();
      const last = data[limit - 1];
      nextCursor = Buffer.from(
        JSON.stringify({
          ...context,
          time: last.acceptance_date_time,
          number: last.accession_number,
        }),
      ).toString("base64url");
    }
    return { data, nextCursor };
  }
}
