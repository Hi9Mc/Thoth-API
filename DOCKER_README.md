# Docker Compose Setup for Testing

This Docker Compose configuration provides local database services for testing the Thoth Database System.

## Services Included

- **MongoDB**: Local MongoDB instance for testing MongoDB database service
- **DynamoDB Local**: Local DynamoDB instance for testing DynamoDB database service

## Quick Start

1. **Start the services:**
   ```bash
   docker compose up -d
   ```

2. **Check service status:**
   ```bash
   docker compose ps
   ```

3. **Stop the services:**
   ```bash
   docker compose down
   ```

4. **Stop and remove volumes (clean slate):**
   ```bash
   docker compose down -v
   ```

## Service Details

### MongoDB
- **Port**: 27017
- **Connection String**: `mongodb://root:password@localhost:27017/thoth?authSource=admin`
- **Database**: thoth
- **Collection**: objects
- **Credentials**: root/password

### DynamoDB Local
- **Port**: 8000
- **Endpoint**: http://localhost:8000
- **Region**: us-east-1
- **Table**: ThothObjects (needs to be created manually or via application)

## Testing with Docker Services

After starting the services, you can run tests that use the local database instances:

```bash
# Navigate to source directory
cd source

# Install dependencies
npm install

# Run tests (will use local database services)
npm test
```

## Environment Variables for Testing

When testing with Docker services, you can set these environment variables:

```bash
# For MongoDB testing
export MONGODB_CONNECTION_STRING="mongodb://root:password@localhost:27017/thoth?authSource=admin"

# For DynamoDB Local testing
export AWS_ACCESS_KEY_ID="fakeAccessKeyId"
export AWS_SECRET_ACCESS_KEY="fakeSecretAccessKey"
export AWS_REGION="us-east-1"
export DYNAMODB_ENDPOINT="http://localhost:8000"
```

## Creating DynamoDB Table

To create the ThothObjects table in DynamoDB Local:

```bash
# Using AWS CLI (requires aws-cli installation)
./init-dynamodb.sh

# Or manually:
aws dynamodb create-table \
    --table-name ThothObjects \
    --attribute-definitions \
        AttributeName=pk,AttributeType=S \
        AttributeName=sk,AttributeType=S \
    --key-schema \
        AttributeName=pk,KeyType=HASH \
        AttributeName=sk,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url http://localhost:8000 \
    --region us-east-1
```

## Data Persistence

- MongoDB data is persisted in `mongodb_data` volume
- DynamoDB Local data is persisted in `dynamodb_data` volume
- Use `docker-compose down -v` to remove all data

## Troubleshooting

1. **Port conflicts**: Make sure ports 27017 and 8000 are not in use
2. **Permission issues**: Run `docker compose up` with appropriate permissions
3. **Service health**: Check logs with `docker compose logs [service-name]`