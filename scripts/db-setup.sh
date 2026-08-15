#!/bin/bash
# Set up postgres user and database
su - postgres -c "psql -c \"CREATE USER wertbot_user WITH PASSWORD 'wertbot_db_pass_123';\"" || true
su - postgres -c "psql -c \"CREATE DATABASE wertbot OWNER wertbot_user;\"" || true
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE wertbot TO wertbot_user;\"" || true

# Set up redis configuration (allow connections, disable password or set the correct one)
# We don't have a redis password set in WSL by default, so we can configure redis to set password 'wertbot_redis_pass_123'
redis-cli config set requirepass "wertbot_redis_pass_123" || true
