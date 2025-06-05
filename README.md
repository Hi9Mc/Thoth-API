# Thoth Database Adapter Module

## คำอธิบายโปรเจกต์

โมดูลนี้เป็นส่วนหนึ่งของระบบ Thoth สำหรับจัดการข้อมูลในรูปแบบต่าง ๆ ผ่าน interface กลาง (`IDatabaseService`) เพื่อให้สามารถเปลี่ยนแปลงหรือขยายฐานข้อมูลได้ง่าย โดยไม่ต้องแก้ไขโค้ดส่วนอื่น ๆ ของระบบ

### โครงสร้างหลัก
- `IDatabaseService.ts` : กำหนด interface และ type สำหรับการติดต่อกับฐานข้อมูล เช่น การสร้าง, อัปเดต, ลบ, ค้นหา, นับจำนวนข้อมูล ฯลฯ
- `InMemoryDatabaseService.ts` : ตัวอย่าง implementation ของ `IDatabaseService` ที่เก็บข้อมูลไว้ในหน่วยความจำ (เหมาะสำหรับทดสอบหรือใช้งานเบื้องต้น)
- `InMemoryDatabaseService.test.ts` : ไฟล์ unit test สำหรับทดสอบการทำงานของ `InMemoryDatabaseService`
- `DynamoDbDatabaseService.ts` : implementation ของ `IDatabaseService` สำหรับ Amazon DynamoDB โดยใช้ AWS SDK v3
- `DynamoDbDatabaseService.test.ts` : ไฟล์ unit test สำหรับทดสอบการทำงานของ `DynamoDbDatabaseService`

## วิธีการใช้งาน

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