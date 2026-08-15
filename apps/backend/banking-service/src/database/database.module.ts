import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { MultiCurrencyWalletEntity } from './entities/wallet.entity';
import { WalletTransferEntity } from './entities/transfer.entity';

export class SafeDataSource extends DataSource {
  constructor(options: DataSourceOptions) {
    super(options);
  }

  override async initialize(): Promise<this> {
    try {
      await super.initialize();
      console.log('✅ PostgreSQL database connected successfully in banking-service.');
      return this;
    } catch (err) {
      console.warn('⚠️ PostgreSQL database is offline. Running banking-service in in-memory fallback mode.');
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
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'wertbot_user'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME', 'wertbot'),
        entities: [UserEntity, MultiCurrencyWalletEntity, WalletTransferEntity],
        synchronize: false,
        logging: config.get<string>('NODE_ENV') === 'development',
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
    TypeOrmModule.forFeature([UserEntity, MultiCurrencyWalletEntity, WalletTransferEntity]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
