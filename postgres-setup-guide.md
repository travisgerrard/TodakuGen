# PostgreSQL Setup Guide for TodakuGen

This guide will help you set up PostgreSQL both locally for development and on your production server.

## Local Installation (macOS)

### Using Homebrew (Recommended)

1. Install Homebrew if you don't have it already:
   ```
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. Install PostgreSQL:
   ```
   brew install postgresql@15
   ```

3. Start the PostgreSQL service:
   ```
   brew services start postgresql@15
   ```

4. Verify the installation:
   ```
   postgres --version
   ```

5. Create a new database:
   ```
   createdb todakugen
   ```

6. Connect to your new database:
   ```
   psql todakugen
   ```

7. Create a dedicated user for your application:
   ```sql
   CREATE USER todakugen_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE todakugen TO todakugen_user;
   ```

### Using Postgres.app (Alternative)

1. Download and install [Postgres.app](https://postgresapp.com/)
2. Open the app and click "Initialize" to create a local PostgreSQL server
3. Follow steps 5-7 from the Homebrew instructions to create your database and user

## Server Installation (Linux)

### Ubuntu/Debian

1. Update your package list:
   ```
   sudo apt update
   ```

2. Install PostgreSQL:
   ```
   sudo apt install postgresql postgresql-contrib
   ```

3. Verify the installation:
   ```
   sudo systemctl status postgresql
   ```

4. Log in as the postgres user to create your database:
   ```
   sudo -u postgres psql
   ```

5. Create a database and user:
   ```sql
   CREATE DATABASE todakugen;
   CREATE USER todakugen_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE todakugen TO todakugen_user;
   ```

6. Configure PostgreSQL to allow connections:
   ```
   sudo nano /etc/postgresql/13/main/postgresql.conf
   ```
   Uncomment and set `listen_addresses = '*'`

7. Configure client authentication:
   ```
   sudo nano /etc/postgresql/13/main/pg_hba.conf
   ```
   Add the following line to allow your application to connect:
   ```
   host    todakugen    todakugen_user    0.0.0.0/0    md5
   ```

8. Restart PostgreSQL:
   ```
   sudo systemctl restart postgresql
   ```

## Setting Up Environment Variables

Update your `.env` file with the PostgreSQL connection information:

```
# MongoDB (previous)
# MONGO_URI=mongodb://localhost:27017/todakugen

# PostgreSQL (new)
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=todakugen
PG_USER=todakugen_user
PG_PASSWORD=your_secure_password
```

## Database Migration

After setting up the database connection in your application code, you'll need to run the migration script to transfer your data from MongoDB to PostgreSQL:

```
node server/scripts/migrateToPostgres.js
```

## Troubleshooting

### Connection Issues

- Verify PostgreSQL is running: `pg_isready`
- Check PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-13-main.log`
- Ensure your firewall allows connections on port 5432

### Permission Issues

- Check user permissions: `\du` in psql
- Ensure database ownership: `\l` in psql

## Further Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Sequelize Documentation](https://sequelize.org/master/) (The ORM we're using with Node.js) 