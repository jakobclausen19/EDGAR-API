import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Sqlite from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { companies, tickers, filings } from "./schema";

@Injectable()
export class CompanyDatabase implements OnModuleDestroy {
  private readonly connection: Sqlite.Database;
  readonly db;
  constructor() {
    const path = process.env.SQLITE_PATH ?? "data/filings.sqlite";
    mkdirSync(dirname(path), { recursive: true });
    this.connection = new Sqlite(path);
    this.db = drizzle(this.connection);
  }
  initialize() {
    this.connection.pragma("foreign_keys = ON");
    migrate(this.db, { migrationsFolder: "migrations" });
    for (const table of [companies, tickers, filings])
      this.db.select().from(table).limit(0).all();
  }
  onModuleDestroy() {
    this.connection.close();
  }
}
