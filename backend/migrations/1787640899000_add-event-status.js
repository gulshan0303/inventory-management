exports.up = (pgm) => {
  pgm.createTable('event_status', {
    event_id: { type: 'uuid', primaryKey: true },
    status: { type: 'varchar(20)', notNull: true },
    event_type: { type: 'varchar(20)', notNull: true },
    product_id: { type: 'varchar(50)', notNull: true },
    quantity: { type: 'integer', notNull: true },
    unit_price: { type: 'numeric(15,4)' },
    steps: { type: 'jsonb', notNull: true },
    error_message: { type: 'text' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') }
  });
};

exports.down = (pgm) => {
  pgm.dropTable('event_status');
};
