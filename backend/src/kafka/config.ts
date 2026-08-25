import { Kafka, KafkaConfig } from 'kafkajs';
import dotenv from 'dotenv';
import path from 'path';

// Need to allow it to find .env from both backend and scripts
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../backend/.env') });

export const createKafkaClient = (): Kafka => {
  const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
  const clientId = process.env.KAFKA_CLIENT_ID || 'inventory-backend';

  const config: KafkaConfig = {
    clientId,
    brokers,
  };

  if (process.env.KAFKA_SSL === 'true') {
    config.ssl = true;
    
    // Only configure SASL if mechanism is provided and SSL is true
    if (process.env.KAFKA_SASL_MECHANISM && process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD) {
      config.sasl = {
        mechanism: process.env.KAFKA_SASL_MECHANISM as any, // 'plain', 'scram-sha-256', or 'scram-sha-512'
        username: process.env.KAFKA_USERNAME,
        password: process.env.KAFKA_PASSWORD,
      };
    }
  }

  return new Kafka(config);
};

export const kafka = createKafkaClient();
