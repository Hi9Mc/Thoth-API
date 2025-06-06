# Thoth Database System - Clean Architecture Implementation

## คำอธิบายโปรเจกต์

ระบบ Thoth ได้รับการปรับปรุงให้ใช้ Clean Architecture พร้อม Design Patterns: Adapter และ Circuit Breaker เพื่อเพิ่มความยืดหยุ่น ความน่าเชื่อถือ และการดูแลรักษาที่ดีขึ้น

### Clean Architecture Structure

โครงสร้างใหม่ประกอบด้วย 4 ชั้นหลัก:

#### 1. Domain Layer (`/domain/`)
- **Entities**: `ProjectObject`, `SearchCriteria` - Core business objects
- **Repositories**: `ProjectObjectRepository` - Repository interfaces (abstractions)
- **Services**: Domain services for business logic

#### 2. Application Layer (`/application/`)
- **Use Cases**: `ProjectObjectUseCase` - Application-specific business rules
- **Services**: Application services and orchestration

#### 3. Infrastructure Layer (`/infrastructure/`)
- **Database**: Database implementations and adapters
- **Circuit Breaker**: Fault tolerance and resilience patterns
- **External**: External service integrations

#### 4. Interface Adapters Layer (`/interface-adapters/`)
- **Controllers**: `ProjectObjectController` - API interface adapters
- **Presenters**: Data presentation logic
- **Gateways**: External service gateways

### Design Patterns Implemented

#### 1. Adapter Pattern
- `DatabaseRepositoryAdapter`: Adapts legacy database services to domain repository interface
- `RepositoryFactory`: Factory for creating repository instances with different adapters

#### 2. Circuit Breaker Pattern  
- `CircuitBreaker`: Implements fault tolerance with states (CLOSED, OPEN, HALF_OPEN)
- `CircuitBreakerRepositoryWrapper`: Wraps repositories with circuit breaker functionality
- Automatic failure detection and recovery mechanisms

### Legacy Compatibility

เก็บโครงสร้างเดิมไว้ใน `/modules/` สำหรับ backward compatibility:
- `IDatabaseService.ts`: Legacy interface 
- `InMemoryDatabaseService.ts`: In-memory implementation
- `DynamoDbDatabaseService.ts`: DynamoDB implementation  
- `MongoDbDatabaseService.ts`: MongoDB implementation

## วิธีการใช้งาน Clean Architecture

### 1. Basic Usage - In-Memory Database with Circuit Breaker

```typescript
import { 
    RepositoryFactory, 
    DatabaseType, 
    ProjectObjectUseCase,
    ProjectObjectController,
    ProjectObject 
} from './index';

// Create repository with circuit breaker
const repository = RepositoryFactory.createWithCircuitBreaker({
    type: DatabaseType.IN_MEMORY
}, {
    failureThreshold: 5,
    resetTimeout: 60000,  // 1 minute
    monitoringPeriod: 10000  // 10 seconds
});

// Create use case and controller
const useCase = new ProjectObjectUseCase(repository);
const controller = new ProjectObjectController(useCase);

// Use the controller
const testObject: ProjectObject = {
    projectId: 'demo-project',
    contentType: 'document',
    contentId: 'demo-doc-1',
    version: 1,
    title: 'Demo Document'
};

const result = await controller.create(testObject);
```

### 2. DynamoDB with Custom Circuit Breaker

```typescript
const repository = RepositoryFactory.createWithCircuitBreaker({
    type: DatabaseType.DYNAMODB,
    tableName: 'MyThothTable',
    region: 'us-west-2'
}, {
    failureThreshold: 3,
    resetTimeout: 30000,  // 30 seconds
    monitoringPeriod: 5000   // 5 seconds
});
```

### 3. MongoDB without Circuit Breaker

```typescript
const repository = RepositoryFactory.create({
    type: DatabaseType.MONGODB,
    connectionString: 'mongodb://localhost:27017',
    databaseName: 'thoth_clean',
    collectionName: 'objects'
});
```

### 4. Circuit Breaker Monitoring

```typescript
// Access circuit breaker metrics
if ('getCircuitBreakerMetrics' in repository) {
    const metrics = repository.getCircuitBreakerMetrics();
    console.log('Circuit Breaker State:', metrics.state);
    console.log('Failure Count:', metrics.failureCount);
    
    // Reset if needed
    if (metrics.failureCount > 0) {
        repository.resetCircuitBreaker();
    }
}
```

## Legacy Database Services Usage (Backward Compatibility)

### 1. การใช้งาน In-Memory Database Service

1. **สร้าง instance ของ Database Service**
   ```typescript
   import { InMemoryDatabaseService } from './modules/adapter/database/InMemoryDatabaseService';
   const db = InMemoryDatabaseService.getInstance();
   ```

### 2. การใช้งาน DynamoDB Service

1. **ติดตั้ง dependencies**
   ```sh
   cd source
   npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
   ```

2. **กำหนด AWS credentials** (เลือกวิธีหนึ่ง)
   - ผ่าน environment variables:
     ```sh
     export AWS_ACCESS_KEY_ID=your_access_key
     export AWS_SECRET_ACCESS_KEY=your_secret_key
     export AWS_REGION=your_region
     ```
   - ผ่าน AWS Config file (`~/.aws/credentials`)
   - ผ่าน IAM Role (สำหรับ EC2/Lambda)

3. **สร้าง instance ของ DynamoDB Service**
   ```typescript
   import { DynamoDbDatabaseService } from './modules/adapter/database/DynamoDbDatabaseService';
   
   // ใช้ default table และ region
   const db = DynamoDbDatabaseService.getInstance();
   
   // หรือระบุ table และ region เอง
   const db = new DynamoDbDatabaseService('MyCustomTable', 'ap-southeast-1');
   
   // หรือใช้ project-specific instance
   const projectDb = DynamoDbDatabaseService.getInstanceByProjectId('project123');
   ```

4. **สร้าง DynamoDB table** (ถ้ายังไม่มี)
   ```typescript
   // สร้าง table อัตโนมัติ (สำหรับ development/testing)
   await db.ensureTable();
   ```

### 3. วิธีใช้งานเมธอดต่าง ๆ (ใช้ได้กับทั้ง In-Memory และ DynamoDB)
   - `create(obj)` : สร้างข้อมูลใหม่
   - `update(obj)` : อัปเดตข้อมูล
   - `delete(projectId, contentType, contentId, version)` : ลบข้อมูล
   - `getByKey(projectId, contentType, contentId, version)` : ดึงข้อมูลตาม id
   - `search(condition, pagination)` : ค้นหาข้อมูลตามเงื่อนไข
   - `exists(condition)` : ตรวจสอบว่ามีข้อมูลตามเงื่อนไขหรือไม่
   - `count(condition)` : นับจำนวนข้อมูลตามเงื่อนไข

   ตัวอย่าง:
   ```typescript
   const obj = { projectId: '1', contentType: 'article', contentId: 'A1', version: 1 };
   await db.create(obj);
   const found = await db.getByKey('1', 'article', 'A1', 1);
   ```

3. **การค้นหาข้อมูล (Search)**
   ใช้ `SearchOption` และ `SearchParameter` เพื่อกำหนดเงื่อนไข เช่น
   ```typescript
   const condition = {
     logic: 'AND',
     conditions: [
       { key: 'contentType', value: 'article', operator: 'EQUALS' },
       { key: 'version', value: 1, operator: 'GREATER_THAN_OR_EQUAL' }
     ]
   };
   const result = await db.search(condition, { page: 1, limit: 10 });
   ```

## การรัน Unit Test

1. ติดตั้ง dependencies (ถ้ายังไม่ได้ติดตั้ง)
   ```sh
   cd source
   npm install
   ```

2. รัน unit test
   ```sh
   npm test
   ```
   หรือ
   ```sh
   npx jest
   ```

ผลลัพธ์จะแสดงสถานะการทดสอบทั้งหมดในคอนโซล

## Docker Compose สำหรับ Testing Environment

สำหรับการทดสอบในเครื่องทดสอบ ระบบมี Docker Compose ที่ตั้งค่าไว้แล้ว ซึ่งประกอบด้วย:
- **MongoDB**: สำหรับทดสอบ MongoDB database service
- **DynamoDB Local**: สำหรับทดสอบ DynamoDB database service

### การใช้งาน Docker Compose

```sh
# เริ่มต้น services
docker compose up -d

# ตรวจสอบสถานะ
docker compose ps

# หยุด services  
docker compose down
```

รายละเอียดเพิ่มเติมดูได้ในไฟล์ [DOCKER_README.md](DOCKER_README.md)

---

**หมายเหตุ:**
- สามารถเพิ่ม implementation ใหม่ของ `IDatabaseService` ได้ เช่น เชื่อมต่อกับฐานข้อมูลจริง (MySQL, MongoDB ฯลฯ) โดยยึดตาม interface เดิม
- DynamoDB Service รองรับการค้นหาที่ซับซ้อนด้วย nested AND/OR conditions
- DynamoDB table structure: Partition Key = `projectId`, Sort Key = `contentType#contentId#version`
- สำหรับ production ควรใช้ IAM Role แทนการใส่ credentials โดยตรง
- ตัวอย่างนี้เหมาะสำหรับ dev จบใหม่หรือผู้ที่ต้องการเข้าใจโครงสร้างและการใช้งานเบื้องต้นของโมดูลนี้

## การ Deploy DynamoDB Table

สำหรับ production ควรสร้าง DynamoDB table ผ่าน Infrastructure as Code เช่น CloudFormation หรือ Terraform:

```yaml
# CloudFormation template
Resources:
  ThothObjectsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: ThothObjects
      BillingMode: PAY_PER_REQUEST
      KeySchema:
        - AttributeName: pk
          KeyType: HASH
        - AttributeName: sk
          KeyType: RANGE
      AttributeDefinitions:
        - AttributeName: pk
          AttributeType: S
        - AttributeName: sk
          AttributeType: S
```