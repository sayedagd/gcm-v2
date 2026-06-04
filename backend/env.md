# Recommended for most uses
DATABASE_URL=postgresql://neondb_owner:npg_SkgzJ2V8YOaK@ep-restless-waterfall-apf5sxvh-pooler.c-7.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require

# For uses requiring a connection without pgbouncer
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:npg_SkgzJ2V8YOaK@ep-restless-waterfall-apf5sxvh.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require

# Parameters for constructing your own connection string
PGHOST=ep-restless-waterfall-apf5sxvh-pooler.c-7.us-east-1.aws.neon.tech
PGHOST_UNPOOLED=ep-restless-waterfall-apf5sxvh.c-7.us-east-1.aws.neon.tech
PGUSER=neondb_owner
PGDATABASE=neondb
PGPASSWORD=npg_SkgzJ2V8YOaK

# Parameters for Vercel Postgres Templates
POSTGRES_URL=postgresql://neondb_owner:npg_SkgzJ2V8YOaK@ep-restless-waterfall-apf5sxvh-pooler.c-7.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require
POSTGRES_URL_NON_POOLING=postgresql://neondb_owner:npg_SkgzJ2V8YOaK@ep-restless-waterfall-apf5sxvh.c-7.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require
POSTGRES_USER=neondb_owner
POSTGRES_HOST=ep-restless-waterfall-apf5sxvh-pooler.c-7.us-east-1.aws.neon.tech
POSTGRES_PASSWORD=npg_SkgzJ2V8YOaK
POSTGRES_DATABASE=neondb
POSTGRES_URL_NO_SSL=postgresql://neondb_owner:npg_SkgzJ2V8YOaK@ep-restless-waterfall-apf5sxvh-pooler.c-7.us-east-1.aws.neon.tech/neondb
POSTGRES_PRISMA_URL=postgresql://neondb_owner:npg_SkgzJ2V8YOaK@ep-restless-waterfall-apf5sxvh-pooler.c-7.us-east-1.aws.neon.tech/neondb?channel_binding=require&connect_timeout=15&sslmode=require