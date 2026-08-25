exports.up = (pgm) => {
  // Products table
  pgm.createTable('products', {
    id: { type: 'uuid', default: pgm.func('gen_random_uuid()'), primaryKey: true },
    product_id: { type: 'varchar(50)', notNull: true, unique: true },
    name: { type: 'varchar(255)', notNull: true },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // Inventory Batches table
  pgm.createTable('inventory_batches', {
    id: { type: 'uuid', default: pgm.func('gen_random_uuid()'), primaryKey: true },
    product_id: {
      type: 'varchar(50)',
      notNull: true,
      references: 'products(product_id)',
      onDelete: 'RESTRICT',
    },
    original_quantity: { type: 'integer', notNull: true, check: 'original_quantity > 0' },
    remaining_quantity: { type: 'integer', notNull: true, check: 'remaining_quantity >= 0' },
    unit_price: { type: 'numeric(15, 4)', notNull: true, check: 'unit_price > 0' },
    purchased_at: { type: 'timestamp with time zone', notNull: true },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // Sales table
  pgm.createTable('sales', {
    id: { type: 'uuid', default: pgm.func('gen_random_uuid()'), primaryKey: true },
    product_id: {
      type: 'varchar(50)',
      notNull: true,
      references: 'products(product_id)',
      onDelete: 'RESTRICT',
    },
    quantity: { type: 'integer', notNull: true, check: 'quantity > 0' },
    total_cost: { type: 'numeric(15, 4)', notNull: true, check: 'total_cost >= 0' },
    sold_at: { type: 'timestamp with time zone', notNull: true },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // Sale Allocations table
  pgm.createTable('sale_allocations', {
    id: { type: 'uuid', default: pgm.func('gen_random_uuid()'), primaryKey: true },
    sale_id: {
      type: 'uuid',
      notNull: true,
      references: 'sales(id)',
      onDelete: 'CASCADE',
    },
    batch_id: {
      type: 'uuid',
      notNull: true,
      references: 'inventory_batches(id)',
      onDelete: 'RESTRICT',
    },
    quantity: { type: 'integer', notNull: true, check: 'quantity > 0' },
    unit_cost: { type: 'numeric(15, 4)', notNull: true, check: 'unit_cost > 0' },
    total_cost: { type: 'numeric(15, 4)', notNull: true, check: 'total_cost > 0' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // Indexes for FIFO and lookups
  pgm.createIndex('inventory_batches', ['product_id']);
  pgm.createIndex('inventory_batches', ['purchased_at']);
  pgm.createIndex('inventory_batches', ['remaining_quantity']);
  pgm.createIndex('sales', ['product_id']);
  pgm.createIndex('sales', ['sold_at']);
  pgm.createIndex('sale_allocations', ['sale_id']);
  pgm.createIndex('sale_allocations', ['batch_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('sale_allocations');
  pgm.dropTable('sales');
  pgm.dropTable('inventory_batches');
  pgm.dropTable('products');
};
