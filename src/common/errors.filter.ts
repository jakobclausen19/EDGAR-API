import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";

@Catch()
export class ErrorsFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp().getResponse();
    const known = error instanceof HttpException;
    const statusCode = known ? error.getStatus() : 500;
    if (!known) Logger.error(error);
    http.status(statusCode).json({
      statusCode,
      message: known ? error.message : "Internal server error",
    });
  }
}
