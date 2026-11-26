import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
  ApiNotFoundResponse,
} from "@nestjs/swagger";
import { Controller, Get, Param } from "@nestjs/common";
import { CompaniesRepository } from "./companies.repository";

@ApiTags("Filings")
@Controller("v1/companies/:ticker/filings")
export class FilingsController {
  constructor(private readonly repository: CompaniesRepository) {}
  @ApiOperation({ summary: "Fetch one SEC filing by accession number" })
  @ApiParam({ name: "ticker", example: "META" })
  @ApiParam({ name: "accessionNumber", example: "0001628280-26-003942" })
  @ApiOkResponse({
    description:
      "Filing identifiers, form, dates, acceptance time, and primary document URL. The report date and document URL may be null.",
  })
  @ApiNotFoundResponse({
    description: "Unknown ticker or filing for this company.",
  })
  @Get(":accessionNumber")
  filing(
    @Param("ticker") ticker: string,
    @Param("accessionNumber") number: string,
  ) {
    return this.repository.filing(ticker, number);
  }
}
