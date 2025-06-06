# Docker Compose Setup for Testing

This Docker Compose configuration provides a complete testing environment for the Thoth Database System, including the application server and local database services.

## Services Included

- **Thoth App**: Express.js API server with REST endpoints
- **MongoDB**: Local MongoDB instance for testing MongoDB database service
- **DynamoDB Local**: Local DynamoDB instance for testing DynamoDB database service

## Quick Start

1. **Start all services:**
   ```bash
   docker compose up -d
   ```

2. **Check service status:**
   ```bash
   docker compose ps
   ```

3. **View application logs:**
   ```bash
   docker compose logs app
   ```

4. **Access the API:**
   - API Server: http://localhost:3000
   - Health Check: http://localhost:3000/health
   - API Documentation: http://localhost:3000

5. **Stop the services:**
   ```bash
   docker compose down
   ```

6. **Stop and remove volumes (clean slate):**
   ```bash
   docker compose down -v
   ```

## Service Details

### Thoth Application
- **Port**: 3000
- **Health Check**: http://localhost:3000/health
- **API Base URL**: http://localhost:3000
- **Default Database**: MongoDB (configurable via DATABASE_TYPE env var)

#### API Endpoints
- `GET /health` - Health check
- `GET /` - API documentation
- `GET|POST|PUT|DELETE /tenants/{tenantId}/resources/{resourceType}/{resourceId}` - Path-based operations
- `GET|POST|PUT|DELETE /resources/{resourceId}` - Header-based operations (requires X-Tenant-Id and X-Resource-Type headers)
- `GET /tenants/{tenantId}/resources/{resourceType}` - Search resources

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
- **Table**: thoth-objects

## Testing with Docker Services

### Option 1: Use the API Server
After starting the services, you can interact with the API directly:

```bash
# Test health check
curl http://localhost:3000/health

# Create a resource
curl -X POST http://localhost:3000/tenants/demo/resources/document/doc1 \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Document", "content": "Hello World"}'

# Get a resource
curl http://localhost:3000/tenants/demo/resources/document/doc1

# Search resources
curl "http://localhost:3000/tenants/demo/resources/document?page=1&limit=10"
```

### Option 2: Run Tests Against Local Databases

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