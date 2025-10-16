import { Catch, ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { MulterError } from 'multer';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const status = exception.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    res.status(status).json({ message: exception.message, code: exception.code });
  }
}