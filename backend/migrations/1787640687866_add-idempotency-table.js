exports.up = (pgm) => {
  pgm.createTable('processed_events', {
    event_id: { type: 'uuid', primaryKey: true },
    processed_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') }
  });
};

exports.down = (pgm) => {
  pgm.dropTable('processed_events');
};
