import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class DatabaseHealthService {
  private readonly logger = new Logger(DatabaseHealthService.name);

  constructor(@InjectConnection() private connection: Connection) {}

  async checkHealth(): Promise<{ status: string; details: any }> {
    try {
      // Verificar que db existe antes de usarlo
      if (!this.connection.db) {
        this.logger.warn('Database object not yet initialized');
        return {
          status: 'unhealthy',
          details: {
            error: 'Database connection not fully initialized',
            readyState: this.connection.readyState
          }
        };
      }

      // Ping a la base de datos
      const result = await this.connection.db.admin().ping();

      const readyState = this.connection.readyState;
      const readyStateMap = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };

      return {
        status: readyState === 1 ? 'healthy' : 'unhealthy',
        details: {
          ping: result,
          readyState: readyStateMap[readyState] || 'unknown',
          host: this.connection.host,
          port: this.connection.port,
          name: this.connection.name,
          collections: await this.getCollectionsCount()
        }
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
          readyState: this.connection.readyState
        }
      };
    }
  }

  private async getCollectionsCount(): Promise<number> {
    try {
      // Verificar que db existe antes de usarlo
      if (!this.connection.db) {
        this.logger.warn('Cannot get collections count: db not initialized');
        return 0;
      }
      
      const collections = await this.connection.db.listCollections().toArray();
      return collections.length;
    } catch (error) {
      this.logger.warn('Could not get collections count:', error.message);
      return 0;
    }
  }

  async waitForConnection(timeoutMs: number = 30000): Promise<boolean> {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      if (this.connection.readyState === 1 && this.connection.db) {
        this.logger.log('✅ MongoDB connection established');
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.logger.error('❌ MongoDB connection timeout');
    return false;
  }
}