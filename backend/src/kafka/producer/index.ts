import { Kafka, Producer, Partitioners } from 'kafkajs';
import dotenv from 'dotenv';
import path from 'path';

// Need to allow it to find .env from both backend and scripts
dotenv.config({ path: path.resolve(__dirname, '../../../../backend/.env') });

let producer: Producer | null = null;

export const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'inventory-backend',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

export const getKafkaProducer = async (): Promise<Producer> => {
  if (producer) {
    return producer;
  }
  producer = kafka.producer({
    createPartitioner: Partitioners.DefaultPartitioner
  });
  await producer.connect();
  console.log('Kafka Producer connected');
  return producer;
};

export const disconnectKafkaProducer = async (): Promise<void> => {
  if (producer) {
    await producer.disconnect();
    console.log('Kafka Producer disconnected');
    producer = null;
  }
};
