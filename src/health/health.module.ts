import { ApiTags, ApiOperation, ApiOkResponse } from "@nestjs/swagger";
import { Controller, Get, Module } from "@nestjs/common";

@ApiTags("Health")
@Controller("health")
class HealthController {
  @ApiOperation({ summary: "Check whether the API is running" })
  @ApiOkResponse({ schema: { example: { status: "ok" } } })
  @Get()
  health() {
    return { status: "ok" };
  }
}
@Module({ controllers: [HealthController] })
export class HealthModule {}
