import { describe, it, expect, beforeEach, afterAll, jest } from '@jest/globals';

jest.mock('kafkajs', () => {
  return {
    Kafka: jest.fn().mockImplementation((config) => {
      return { _config: config };
    })
  };
});

describe('Kafka Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should create default configuration for local development', () => {
    process.env.KAFKA_BROKERS = 'localhost:9092';
    process.env.KAFKA_CLIENT_ID = 'test-client';
    delete process.env.KAFKA_SSL;
    delete process.env.KAFKA_SASL_MECHANISM;
    
    const { createKafkaClient } = require('../../src/kafka/config');
    const kafkaInstance = createKafkaClient();
    const config = kafkaInstance._config;
    
    expect(config.clientId).toBe('test-client');
    expect(config.brokers).toEqual(['localhost:9092']);
    expect(config.ssl).toBeFalsy();
    expect(config.sasl).toBeUndefined();
  });

  it('should create SSL and SASL configuration for production managed Kafka', () => {
    process.env.KAFKA_BROKERS = 'managed-kafka.example.com:9092';
    process.env.KAFKA_CLIENT_ID = 'prod-client';
    process.env.KAFKA_SSL = 'true';
    process.env.KAFKA_SASL_MECHANISM = 'plain';
    process.env.KAFKA_USERNAME = 'my-user';
    process.env.KAFKA_PASSWORD = 'my-password';
    
    const { createKafkaClient } = require('../../src/kafka/config');
    const kafkaInstance = createKafkaClient();
    const config = kafkaInstance._config;
    
    expect(config.clientId).toBe('prod-client');
    expect(config.brokers).toEqual(['managed-kafka.example.com:9092']);
    expect(config.ssl).toBeTruthy();
    expect(config.sasl).toBeDefined();
    expect(config.sasl.mechanism).toBe('plain');
    expect(config.sasl.username).toBe('my-user');
    expect(config.sasl.password).toBe('my-password');
  });
});

