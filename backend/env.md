# SECURITY NOTICE
# Real credentials were removed from this tracked file.
# Rotate all previously exposed DB credentials and JWT secrets in your provider.

# Recommended for most uses
DATABASE_URL=postgresql://<user>:<password>@<host>/<database>?channel_binding=require&sslmode=require

# For uses requiring a connection without pgbouncer
DATABASE_URL_UNPOOLED=postgresql://<user>:<password>@<host>/<database>?sslmode=require

# Parameters for constructing your own connection string
PGHOST=<host>
PGHOST_UNPOOLED=<host_unpooled>
PGUSER=<user>
PGDATABASE=<database>
PGPASSWORD=<password>

# Parameters for Vercel Postgres Templates
POSTGRES_URL=postgresql://<user>:<password>@<host>/<database>?channel_binding=require&sslmode=require
POSTGRES_URL_NON_POOLING=postgresql://<user>:<password>@<host_unpooled>/<database>?channel_binding=require&sslmode=require
POSTGRES_USER=<user>
POSTGRES_HOST=<host>
POSTGRES_PASSWORD=<password>
POSTGRES_DATABASE=<database>
POSTGRES_URL_NO_SSL=postgresql://<user>:<password>@<host>/<database>
POSTGRES_PRISMA_URL=postgresql://<user>:<password>@<host>/<database>?channel_binding=require&connect_timeout=15&sslmode=require