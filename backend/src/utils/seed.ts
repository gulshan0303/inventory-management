import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const seed = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database for seeding...');

    // Seed products
    const products = [
      { product_id: 'PRD001', name: 'Premium Widget' },
      { product_id: 'PRD002', name: 'Standard Sprocket' },
      { product_id: 'PRD003', name: 'Basic Gadget' },
    ];

    for (const p of products) {
      await client.query(
        `INSERT INTO products (product_id, name) 
         VALUES ($1, $2) 
         ON CONFLICT (product_id) DO NOTHING`,
        [p.product_id, p.name]
      );
    }
    
    console.log('Products seeded successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await client.end();
  }
};

seed();
