import { getKafkaProducer, disconnectKafkaProducer } from '../../backend/src/kafka/producer';
import { InventoryEvent } from '../../backend/src/validators/kafkaEvents';
import { randomUUID } from 'crypto';

const KAFKA_TOPIC = 'inventory-events';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const runSimulator = async () => {
  try {
    const producer = await getKafkaProducer();
    
    // Scenarios based on Phase 12 requirements
    const events: InventoryEvent[] = [
      {
        event_id: randomUUID(),
        product_id: 'PRD001',
        event_type: 'purchase',
        quantity: 50,
        unit_price: 100.0,
        timestamp: new Date().toISOString(),
      },
      {
        event_id: randomUUID(),
        product_id: 'PRD001',
        event_type: 'purchase',
        quantity: 30,
        unit_price: 120.0,
        timestamp: new Date().toISOString(),
      },
      {
        event_id: randomUUID(),
        product_id: 'PRD001',
        event_type: 'sale',
        quantity: 60,
        timestamp: new Date().toISOString(),
      },
      {
        event_id: randomUUID(),
        product_id: 'PRD002',
        event_type: 'purchase',
        quantity: 100,
        unit_price: 80.0,
        timestamp: new Date().toISOString(),
      },
      {
        event_id: randomUUID(),
        product_id: 'PRD002',
        event_type: 'sale',
        quantity: 20,
        timestamp: new Date().toISOString(),
      },
      {
        event_id: randomUUID(),
        product_id: 'PRD001',
        event_type: 'purchase',
        quantity: 40,
        unit_price: 150.0,
        timestamp: new Date().toISOString(),
      },
      {
        event_id: randomUUID(),
        product_id: 'PRD001',
        event_type: 'sale',
        quantity: 10,
        timestamp: new Date().toISOString(),
      },
    ];

    console.log(`Starting Kafka Simulator. Publishing ${events.length} events...`);
    
    for (const event of events) {
      await producer.send({
        topic: KAFKA_TOPIC,
        messages: [
          { key: event.product_id, value: JSON.stringify(event) }
        ]
      });
      console.log(`Published ${event.event_type} event for ${event.product_id} - Qty: ${event.quantity}`);
      await delay(1000); // 1 sec delay between events to simulate real traffic
    }
    
    console.log('Simulator finished.');
  } catch (error) {
    console.error('Simulator error:', error);
  } finally {
    await disconnectKafkaProducer();
  }
};

runSimulator();
