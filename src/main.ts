import "reflect-metadata";
import { Logger, Module } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { NestFactory } from "@nestjs/core";
import { HealthModule } from "./health/health.module";
import { CompaniesModule } from "./companies/companies.module";
import { ErrorsFilter } from "./common/errors.filter";
@Module({ imports: [HealthModule, CompaniesModule] })
class AppModule {}
export async function createApp() {
  const app = await NestFactory.create(AppModule, { abortOnError: false });
  app.useGlobalFilters(new ErrorsFilter());
  try {
    const config = new DocumentBuilder()
      .setTitle("EDGAR filings API")
      .setDescription(
        "Look up companies by ticker and browse their SEC filing histories. All operations are public.",
      )
      .setVersion("1")
      .build();
    SwaggerModule.setup(
      "docs",
      app,
      () => SwaggerModule.createDocument(app, config),
      { raw: ["json"] },
    );
    await app.init();
  } catch (error) {
    await app.close();
    throw error;
  }
  return app;
}
if (require.main === module) {
  createApp()
    .then(async (app) => {
      app.enableShutdownHooks();
      const port = 3000;
      await app.listen(port);
      Logger.log(`API is ready at http://localhost:${port}/`, "EDGAR API");
    })
    .catch((error) => {
      Logger.fatal("Startup failed: " + String(error), "EDGAR API");
      process.exitCode = 1;
    });
}
