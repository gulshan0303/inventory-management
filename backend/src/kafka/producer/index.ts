import { Producer, Partitioners } from 'kafkajs';
import { kafka } from '../config';

let producer: Producer | null = null;

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
