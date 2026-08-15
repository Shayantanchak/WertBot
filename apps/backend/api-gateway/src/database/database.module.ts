import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { DeviceSessionEntity } from './entities/device-session.entity';

export class SafeDataSource extends DataSource {
  constructor(options: DataSourceOptions) {
    super(options);
  }

  override async initialize(): Promise<this> {
    try {
      await super.initialize();
      console.log('✅ PostgreSQL database connected successfully in api-gateway.');
      return this;
    } catch (err) {
      console.warn('⚠️ PostgreSQL database is offline. Running api-gateway in database-offline mode.');
      return this;
    }
  }
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host:     config.get<string>('DB_HOST', 'localhost'),
        port:     config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'wertbot_user'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME', 'wertbot'),
        entities:    [UserEntity, DeviceSessionEntity],
        synchronize: false,
        logging:     config.get<string>('NODE_ENV') === 'development',
        ssl: config.get<string>('DB_SSL', 'false') === 'true'
          ? { rejectUnauthorized: false }
          : false,
        poolSize: 10,
        connectTimeoutMS: 3000, // Quick timeout for fast dev fallback
      }),
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('No DataSourceOptions provided.');
        }
        return new SafeDataSource(options);
      },
    }),
    TypeOrmModule.forFeature([UserEntity, DeviceSessionEntity]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
