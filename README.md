# Thoth Database Adapter Module

## คำอธิบายโปรเจกต์

โมดูลนี้เป็นส่วนหนึ่งของระบบ Thoth สำหรับจัดการข้อมูลในรูปแบบต่าง ๆ ผ่าน interface กลาง (`IDatabaseService`) เพื่อให้สามารถเปลี่ยนแปลงหรือขยายฐานข้อมูลได้ง่าย โดยไม่ต้องแก้ไขโค้ดส่วนอื่น ๆ ของระบบ

### โครงสร้างหลัก
- `IDatabaseService.ts` : กำหนด interface และ type สำหรับการติดต่อกับฐานข้อมูล เช่น การสร้าง, อัปเดต, ลบ, ค้นหา, นับจำนวนข้อมูล ฯลฯ
- `InMemoryDatabaseService.ts` : ตัวอย่าง implementation ของ `IDatabaseService` ที่เก็บข้อมูลไว้ในหน่วยความจำ (เหมาะสำหรับทดสอบหรือใช้งานเบื้องต้น)
- `InMemoryDatabaseService.test.ts` : ไฟล์ unit test สำหรับทดสอบการทำงานของ `InMemoryDatabaseService`

## วิธีการใช้งาน

1. **สร้าง instance ของ Database Service**
   ```typescript
   import { InMemoryDatabaseService } from './modules/adapter/database/InMemoryDatabaseService';
   const db = InMemoryDatabaseService.getInstance();
   ```

2. **ใช้งานเมธอดต่าง ๆ**
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
- ตัวอย่างนี้เหมาะสำหรับ dev จบใหม่หรือผู้ที่ต้องการเข้าใจโครงสร้างและการใช้งานเบื้องต้นของโมดูลนี้