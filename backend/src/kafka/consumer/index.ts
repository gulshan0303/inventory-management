import { InventoryEventSchema } from '../../validators/kafkaEvents';
import { InventoryService } from '../../services/inventory.service';
import { IdempotencyRepository } from '../../repositories/idempotency.repository';
import { EventRepository } from '../../repositories/event.repository';
import { kafka } from '../config';

const consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID || 'inventory-consumer-group',
});

export const startKafkaConsumer = async () => {
  try {
    await consumer.connect();
    console.log('Kafka Consumer connected successfully');
    
    await consumer.subscribe({ topic: process.env.KAFKA_TOPIC || 'inventory-events', fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        
        const payloadString = message.value.toString();
        let eventId: string | undefined;
        let steps: any[] = [];
        
        try {
          const payload = JSON.parse(payloadString);
          eventId = payload.event_id;
          
          if (eventId) {
            let statusRecord = await EventRepository.getEventStatus(eventId);
            if (!statusRecord) {
              steps = [
                { name: 'PUBLISHED', status: 'SUCCESS' },
                { name: 'CONSUMED', status: 'SUCCESS' },
                { name: 'VALIDATED', status: 'PENDING' },
                { name: 'FIFO_PROCESSED', status: 'PENDING' },
                { name: 'DATABASE_COMMITTED', status: 'PENDING' }
              ];
              await EventRepository.createEventStatus(
                eventId,
                payload.event_type || 'purchase',
                payload.product_id || 'UNKNOWN',
                payload.quantity || 0,
                payload.unit_price || null,
                steps
              );
            } else {
              steps = statusRecord.steps;
              const consumedStep = steps.find(s => s.name === 'CONSUMED');
              if (consumedStep) consumedStep.status = 'SUCCESS';
              const validatedStep = steps.find(s => s.name === 'VALIDATED');
              if (validatedStep) validatedStep.status = 'PENDING';
            }
            await EventRepository.updateEventSteps(eventId, steps, 'PROCESSING');
          }
          
          // Validation
          const parsed = InventoryEventSchema.safeParse(payload);
          if (!parsed.success) {
            const errorMsg = parsed.error.issues[0]?.message || 'Invalid Kafka message format';
            console.error('Permanent Error: Invalid Kafka message format:', parsed.error);
            if (eventId) {
              const validatedStep = steps.find(s => s.name === 'VALIDATED');
              if (validatedStep) {
                validatedStep.status = 'FAILED';
                validatedStep.error = errorMsg;
              }
              await EventRepository.updateEventSteps(eventId, steps, 'FAILED', errorMsg);
            }
            return; // Skip invalid message permanently
          }
          
          const event = parsed.data;
          
          if (eventId) {
            const validatedStep = steps.find(s => s.name === 'VALIDATED');
            if (validatedStep) validatedStep.status = 'SUCCESS';
            const fifoStep = steps.find(s => s.name === 'FIFO_PROCESSED');
            if (fifoStep) fifoStep.status = 'PENDING';
            await EventRepository.updateEventSteps(eventId, steps, 'PROCESSING');
          }

          // Idempotency check via DB
          const isNew = await IdempotencyRepository.recordEvent(event.event_id);
          if (!isNew) {
            console.log(`Duplicate event ${event.event_id} ignored.`);
            if (eventId) {
              const fifoStep = steps.find(s => s.name === 'FIFO_PROCESSED');
              if (fifoStep) fifoStep.status = 'SUCCESS';
              const dbStep = steps.find(s => s.name === 'DATABASE_COMMITTED');
              if (dbStep) dbStep.status = 'SUCCESS';
              await EventRepository.updateEventSteps(eventId, steps, 'SUCCESS');
            }
            return;
          }

          // Business Processing
          try {
            if (event.event_type === 'purchase') {
              await InventoryService.processPurchase(
                event.product_id,
                event.quantity,
                event.unit_price,
                new Date(event.timestamp)
              );
            } else if (event.event_type === 'sale') {
              await InventoryService.processSale(
                event.product_id,
                event.quantity,
                new Date(event.timestamp)
              );
            }

            if (eventId) {
              const fifoStep = steps.find(s => s.name === 'FIFO_PROCESSED');
              if (fifoStep) fifoStep.status = 'SUCCESS';
              const dbStep = steps.find(s => s.name === 'DATABASE_COMMITTED');
              if (dbStep) dbStep.status = 'SUCCESS';
              await EventRepository.updateEventSteps(eventId, steps, 'SUCCESS');
            }
            
            console.log(`Processed ${event.event_type} event successfully: ${event.event_id}`);
          } catch (err: any) {
            console.error(`Error processing business logic for event ${eventId}:`, err.message);
            
            if (eventId) {
              const isInsufficient = err.name === 'InsufficientInventoryError' || err.message.includes('Insufficient');
              const errorCode = isInsufficient ? 'INSUFFICIENT_INVENTORY' : 'PROCESSING_ERROR';
              
              const fifoStep = steps.find(s => s.name === 'FIFO_PROCESSED');
              if (fifoStep) {
                fifoStep.status = 'FAILED';
                fifoStep.error = errorCode;
              }
              const dbStep = steps.find(s => s.name === 'DATABASE_COMMITTED');
              if (dbStep) {
                dbStep.status = 'FAILED';
                dbStep.error = 'TRANSACTION_ROLLED_BACK';
              }
              await EventRepository.updateEventSteps(eventId, steps, 'FAILED', errorCode);
            }
            
            const isInsufficient = err.name === 'InsufficientInventoryError' || err.message.includes('Insufficient');
            if (!isInsufficient) {
              throw err; 
            }
          }

        } catch (error: any) {
          console.error('Error processing Kafka message:', error.message);
          throw error; 
        }
      },
    });
  } catch (err) {
    console.error('Failed to start Kafka consumer', err);
  }
};

export const disconnectKafkaConsumer = async (): Promise<void> => {
  try {
    await consumer.disconnect();
    console.log('Kafka Consumer disconnected');
  } catch (error) {
    console.error('Failed to disconnect Kafka consumer:', error);
  }
};
