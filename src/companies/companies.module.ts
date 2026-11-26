import { Logger, Module, OnModuleInit } from "@nestjs/common";
import { CompaniesController } from "./companies.controller";
import { FilingsController } from "./filings.controller";
import { CompanyDatabase } from "./database";
import { CompaniesRepository } from "./companies.repository";
import { EdgarAdapter } from "./edgar.adapter";

@Module({
  controllers: [CompaniesController, FilingsController],
  providers: [CompanyDatabase, CompaniesRepository, EdgarAdapter],
})
export class CompaniesModule implements OnModuleInit {
  constructor(
    private readonly database: CompanyDatabase,
    private readonly adapter: EdgarAdapter,
    private readonly repository: CompaniesRepository,
  ) {}
  async onModuleInit() {
    this.database.initialize();
    Logger.log("Importing data from EDGAR...", "CompaniesModule");
    this.repository.save(await this.adapter.load());
  }
}
