import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { MongoServerSelectionError, MongoNetworkError, MongoNetworkTimeoutError } from 'mongodb';

@Catch(MongoServerSelectionError, MongoNetworkError, MongoNetworkTimeoutError)
export class DatabaseErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseErrorFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error de base de datos';
    let details: string | null = null;

    if (exception instanceof MongoServerSelectionError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Base de datos temporalmente no disponible';
      details = 'Error de selección de servidor MongoDB';

      this.logger.error(`MongoDB Server Selection Error: ${exception.message}`);

    } else if (exception instanceof MongoNetworkTimeoutError) {
      status = HttpStatus.REQUEST_TIMEOUT;
      message = 'Timeout de base de datos';
      details = 'La conexión a MongoDB tardó demasiado tiempo';

      this.logger.error(`MongoDB Network Timeout: ${exception.message}`);

    } else if (exception instanceof MongoNetworkError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Error de conexión a base de datos';
      details = 'Error de red con MongoDB';

      this.logger.error(`MongoDB Network Error: ${exception.message}`);
    }

    // Log adicional para debugging
    this.logger.error(`Database error on ${request.method} ${request.url}:`, {
      error: exception.constructor.name,
      message: exception.message,
      cause: exception.cause?.message,
      topology: exception.reason?.type
    });

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: message,
      details,
      suggestion: this.getSuggestion(exception)
    });
  }

  private getSuggestion(exception: any): string {
    if (exception instanceof MongoServerSelectionError) {
      return 'Verifica tu conexión a internet y que la base de datos esté disponible. Si el problema persiste, contacta al administrador.';
    }

    if (exception instanceof MongoNetworkTimeoutError) {
      return 'Intenta nuevamente en unos momentos. Si el problema persiste, la red puede estar saturada.';
    }

    return 'Intenta nuevamente. Si el problema persiste, contacta al soporte técnico.';
  }
}