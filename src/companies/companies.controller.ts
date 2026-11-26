import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from "@nestjs/swagger";
import { Controller, Get, Param, Query } from "@nestjs/common";
import { CompaniesRepository } from "./companies.repository";

@ApiTags("Companies")
@Controller("v1/companies")
export class CompaniesController {
  constructor(private readonly repository: CompaniesRepository) {}

  @ApiOperation({ summary: "Look up a company by stock ticker" })
  @ApiParam({
    name: "ticker",
    example: "AAPL",
    description: "Case-insensitive ticker symbol.",
  })
  @ApiOkResponse({
    description: "Company CIK, name, and current tickers.",
    schema: {
      example: { cik: "0000320193", name: "Apple Inc.", tickers: ["AAPL"] },
    },
  })
  @ApiNotFoundResponse({ description: "Unknown ticker." })
  @Get(":ticker")
  company(@Param("ticker") ticker: string) {
    return this.repository.company(ticker);
  }

  @ApiOperation({
    summary: "List a company’s filings",
    description:
      "Newest acceptance time first. Use nextCursor with the same company and filters to continue.",
  })
  @ApiParam({ name: "ticker", example: "AAPL" })
  @ApiQuery({
    name: "form",
    required: false,
    example: "10-K",
    description: "Exact SEC form type.",
  })
  @ApiQuery({
    name: "from",
    required: false,
    schema: { type: "string", format: "date" },
    description: "Inclusive earliest filing date.",
  })
  @ApiQuery({
    name: "to",
    required: false,
    schema: { type: "string", format: "date" },
    description: "Inclusive latest filing date.",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    schema: { type: "integer", minimum: 1, maximum: 100, default: 25 },
  })
  @ApiQuery({
    name: "cursor",
    required: false,
    type: String,
    description: "Opaque continuation cursor from the previous page.",
  })
  @ApiOkResponse({
    description:
      "Filing rows in data, plus nextCursor (null on the last page).",
  })
  @ApiBadRequestResponse({
    description: "Invalid filters, page size, or cursor.",
  })
  @ApiNotFoundResponse({ description: "Unknown ticker." })
  @Get(":ticker/filings")
  list(@Param("ticker") ticker: string, @Query() query: unknown) {
    return this.repository.list(ticker, query);
  }
}
