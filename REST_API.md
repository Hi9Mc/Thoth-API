# Thoth REST API

This document describes the REST API endpoints available in the Thoth system after the field name migration and REST API implementation.

## Field Name Changes

The system has been updated to use the following field names:
- `projectId` → `tenantId`
- `contentType` → `resourceType`
- `contentId` → `resourceId`

All existing functionality has been preserved while using the new field names.

## API Endpoints

The system now supports two patterns of REST API endpoints as requested:

### 1. Path-based Endpoints

Format: `/tenants/{tenantId}/resources/{resourceType}/{resourceId}`

#### Get Resource
```
GET /tenants/{tenantId}/resources/{resourceType}/{resourceId}?version={version}
```
Retrieves a specific resource by tenant, type, and ID.

**Example:**
```bash
GET /tenants/my-company/resources/document/user-guide?version=1
```

#### Create Resource
```
POST /tenants/{tenantId}/resources/{resourceType}/{resourceId}
Content-Type: application/json

{
  "title": "User Guide",
  "content": "Welcome to our system...",
  "version": 1
}
```

#### Update Resource
```
PUT /tenants/{tenantId}/resources/{resourceType}/{resourceId}
Content-Type: application/json

{
  "title": "Updated User Guide",
  "content": "Welcome to our updated system...",
  "version": 2
}
```

#### Delete Resource
```
DELETE /tenants/{tenantId}/resources/{resourceType}/{resourceId}?version={version}
```

#### Search Resources
```
GET /tenants/{tenantId}/resources/{resourceType}?page=1&limit=20&sortBy=title&sortDirection=ASC
```
Returns a list of resources matching the tenant and type.

### 2. Header-based Endpoints

Format: `/resources/{resourceId}` with required headers

#### Get Resource with Headers
```
GET /resources/{resourceId}?version={version}
X-Tenant-Id: {tenantId}
X-Resource-Type: {resourceType}
```

**Example:**
```bash
GET /resources/user-guide?version=1
X-Tenant-Id: my-company
X-Resource-Type: document
```

#### Create Resource with Headers
```
POST /resources/{resourceId}
X-Tenant-Id: {tenantId}
X-Resource-Type: {resourceType}
Content-Type: application/json

{
  "title": "User Guide",
  "content": "Welcome to our system...",
  "version": 1
}
```

#### Update Resource with Headers
```
PUT /resources/{resourceId}
X-Tenant-Id: {tenantId}
X-Resource-Type: {resourceType}
Content-Type: application/json

{
  "title": "Updated User Guide",
  "content": "Welcome to our updated system...",
  "version": 2
}
```

#### Delete Resource with Headers
```
DELETE /resources/{resourceId}?version={version}
X-Tenant-Id: {tenantId}
X-Resource-Type: {resourceType}
```

## Response Format

All endpoints return JSON responses with consistent structure:

### Success Response
```json
{
  "tenantId": "my-company",
  "resourceType": "document",
  "resourceId": "user-guide",
  "version": 1,
  "title": "User Guide",
  "content": "Welcome to our system..."
}
```

### Error Response
```json
{
  "error": "Resource not found"
}
```

### Search Response
```json
{
  "results": [
    {
      "tenantId": "my-company",
      "resourceType": "document",
      "resourceId": "user-guide",
      "version": 1,
      "title": "User Guide"
    }
  ],
  "total": 1
}
```

## HTTP Status Codes

- `200 OK` - Successful GET/PUT operation
- `201 Created` - Successful POST operation
- `204 No Content` - Successful DELETE operation
- `400 Bad Request` - Invalid request (missing headers, validation errors)
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Usage Examples

### Console Application

```typescript
import { RestApiController, ProjectObjectUseCase, RepositoryFactory, DatabaseType } from 'thoth';

// Setup
const repository = RepositoryFactory.create({ type: DatabaseType.IN_MEMORY });
const useCase = new ProjectObjectUseCase(repository);
const controller = new RestApiController(useCase);

// Create a resource
const result = await controller.createResourceByPath(
  'my-company', 
  'document', 
  'user-guide',
  { title: 'User Guide', content: 'Welcome...' }
);

console.log(result); // { status: 201, data: { ... } }
```

### AWS Lambda Function

```typescript
import { lambdaHandler } from 'thoth/examples/RestApiExamples';

export const handler = async (event: any) => {
  return await lambdaHandler(event);
};
```

### Express.js Integration

```typescript
import express from 'express';
import { setupExpressRoutes } from 'thoth/examples/RestApiExamples';

const app = express();
setupExpressRoutes(app);

app.listen(3000, () => {
  console.log('Thoth API server running on port 3000');
});
```

## Migration Guide

If you're migrating from the old field names, update your code as follows:

### Before (Old Field Names)
```typescript
const resource = {
  projectId: 'my-project',
  contentType: 'document',
  contentId: 'user-guide',
  version: 1
};
```

### After (New Field Names)
```typescript
const resource = {
  tenantId: 'my-project',
  resourceType: 'document',
  resourceId: 'user-guide',
  version: 1
};
```

All database operations, controllers, and use cases have been updated to use the new field names. The API endpoints provide a clean REST interface for both console applications and AWS Lambda functions.

## Database Tenant Configuration

The system has been updated to support true multi-tenant data isolation at the database level:

### DynamoDB
- **Table Naming**: Each tenant gets its own table named `{tenantId}`
- **Example**: Tenant "my-company" uses table "my-company"
- **Auto-Creation**: Tables are automatically created when a tenant is first accessed (in non-test environments)

### MongoDB  
- **Database Naming**: Each tenant gets its own database named `{tenantId}`
- **Collection Naming**: Within each tenant database, collections are named by `{resourceType}`
- **Example**: Tenant "my-company" uses database "my-company" with collections like "document", "user", "config"
- **Auto-Creation**: Databases and collections are automatically created when data is first written (MongoDB's default behavior)

### ElasticSearch (Future)
- **Index Naming**: Pattern `{tenantId}_{resourceType}`
- **Example**: Tenant "my-company" with resourceType "document" uses index "my-company_document"

### Automatic Database/Table Creation

The system now automatically creates the necessary database structures when a new tenant is used:

- **DynamoDB**: When `DynamoDbDatabaseService.getInstanceByTenantId(tenantId)` is called, the system automatically attempts to create the tenant's table if it doesn't exist
- **MongoDB**: When `MongoDbDatabaseService.getInstanceByTenantId(tenantId)` is called, the system establishes a connection and MongoDB automatically creates databases and collections as needed
- **Test Environment**: Auto-creation is disabled during tests to avoid external dependencies

**Usage Example:**
```typescript
// This will automatically create the "my-company" table in DynamoDB
const dynamoService = DynamoDbDatabaseService.getInstanceByTenantId('my-company');

// This will automatically create the "my-company" database in MongoDB
const mongoService = MongoDbDatabaseService.getInstanceByTenantId('my-company');
```

This configuration provides complete data isolation between tenants while maintaining efficient access patterns for each tenant's data.