import { Module } from '@nestjs/common';
import { SmsParserService } from './sms-parser.service';

@Module({
  providers: [SmsParserService],
  exports: [SmsParserService],
})
export class SmsParserModule {}
