-- Create replay store for Last-Event-ID reconnect support
CREATE TABLE IF NOT EXISTS event_bus_replay (
    id BIGSERIAL PRIMARY KEY,
    event_name VARCHAR(120) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_bus_replay_created_at ON event_bus_replay (created_at);
CREATE INDEX IF NOT EXISTS idx_event_bus_replay_event_name ON event_bus_replay (event_name);
