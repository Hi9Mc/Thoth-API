/**
 * @jest-environment node
 */
import '@jest/globals';
import 'jest';
import { ProjectObject } from './domain/entities/ProjectObject';
import { InMemoryDatabaseService } from './infrastructure/database/InMemoryDatabaseService';
import { ProjectObjectUseCase } from './application/use-cases/ProjectObjectUseCase';
import { DatabaseRepositoryAdapter } from './infrastructure/database/DatabaseRepositoryAdapter';

describe('Version Logic - Optimistic Locking', () => {
    let useCase: ProjectObjectUseCase<ProjectObject>;

    beforeEach(() => {
        const dbService = new InMemoryDatabaseService<ProjectObject>();
        const repository = new DatabaseRepositoryAdapter(dbService);
        useCase = new ProjectObjectUseCase(repository);
    });

    describe('Create Operations', () => {
        it('should set version to 1 when creating new object', async () => {
            const testObject: ProjectObject = {
                tenantId: 'test-tenant',
                resourceType: 'document',
                resourceId: 'doc-1',
                version: 999, // This should be ignored and set to 1
                title: 'Test Document'
            };

            const result = await useCase.createObject(testObject);

            expect(result.version).toBe(1);
            expect(result.tenantId).toBe('test-tenant');
            expect(result.resourceType).toBe('document');
            expect(result.resourceId).toBe('doc-1');
            expect(result.title).toBe('Test Document');
        });

        it('should throw error when trying to create object that already exists', async () => {
            const testObject: ProjectObject = {
                tenantId: 'test-tenant',
                resourceType: 'document',
                resourceId: 'doc-1',
                version: 1,
                title: 'Test Document'
            };

            // Create first time
            await useCase.createObject(testObject);

            // Try to create again - should fail
            await expect(useCase.createObject(testObject)).rejects.toThrow(
                'Object with key test-tenant#document#doc-1 already exists. To update existing objects, use PUT instead of POST.'
            );
        });
    });

    describe('Update Operations', () => {
        let createdObject: ProjectObject;

        beforeEach(async () => {
            const testObject: ProjectObject = {
                tenantId: 'test-tenant',
                resourceType: 'document',
                resourceId: 'doc-1',
                version: 1,
                title: 'Test Document'
            };
            createdObject = await useCase.createObject(testObject);
        });

        it('should successfully update when version is correct (current + 1)', async () => {
            const updateObject: ProjectObject = {
                ...createdObject,
                version: 2, // Current is 1, so this should work
                title: 'Updated Document'
            };

            const result = await useCase.updateObject(updateObject);

            expect(result.version).toBe(2);
            expect(result.title).toBe('Updated Document');
        });

        it('should throw error when version is too low', async () => {
            const updateObject: ProjectObject = {
                ...createdObject,
                version: 1, // Current is 1, so this should fail (needs to be 2)
                title: 'Updated Document'
            };

            await expect(useCase.updateObject(updateObject)).rejects.toThrow(
                'Version mismatch. Expected 2, got 1'
            );
        });

        it('should throw error when version is too high', async () => {
            const updateObject: ProjectObject = {
                ...createdObject,
                version: 3, // Current is 1, so this should fail (needs to be 2)
                title: 'Updated Document'
            };

            await expect(useCase.updateObject(updateObject)).rejects.toThrow(
                'Version mismatch. Expected 2, got 3'
            );
        });

        it('should allow sequential updates with correct version increments', async () => {
            // First update
            const update1: ProjectObject = {
                ...createdObject,
                version: 2,
                title: 'First Update'
            };
            const result1 = await useCase.updateObject(update1);
            expect(result1.version).toBe(2);

            // Second update
            const update2: ProjectObject = {
                ...result1,
                version: 3,
                title: 'Second Update'
            };
            const result2 = await useCase.updateObject(update2);
            expect(result2.version).toBe(3);

            // Third update
            const update3: ProjectObject = {
                ...result2,
                version: 4,
                title: 'Third Update'
            };
            const result3 = await useCase.updateObject(update3);
            expect(result3.version).toBe(4);
            expect(result3.title).toBe('Third Update');
        });

        it('should throw error when trying to update non-existent object', async () => {
            const updateObject: ProjectObject = {
                tenantId: 'test-tenant',
                resourceType: 'document',
                resourceId: 'non-existent',
                version: 2,
                title: 'Updated Document'
            };

            await expect(useCase.updateObject(updateObject)).rejects.toThrow(
                'Object with key test-tenant#document#non-existent not found'
            );
        });
    });

    describe('Get Operations', () => {
        it('should retrieve latest version of object by key (without version)', async () => {
            const testObject: ProjectObject = {
                tenantId: 'test-tenant',
                resourceType: 'document',
                resourceId: 'doc-1',
                version: 1,
                title: 'Original Document'
            };

            const created = await useCase.createObject(testObject);

            // Update to version 2
            const updated = await useCase.updateObject({
                ...created,
                version: 2,
                title: 'Updated Document'
            });

            // Get by key should return version 2 (latest)
            const retrieved = await useCase.getObject({
                tenantId: 'test-tenant',
                resourceType: 'document',
                resourceId: 'doc-1'
            });

            expect(retrieved).not.toBeNull();
            expect(retrieved!.version).toBe(2);
            expect(retrieved!.title).toBe('Updated Document');
        });

        it('should return null for non-existent object', async () => {
            const result = await useCase.getObject({
                tenantId: 'test-tenant',
                resourceType: 'document',
                resourceId: 'non-existent'
            });

            expect(result).toBeNull();
        });
    });

    describe('Delete Operations', () => {
        it('should delete object by key (without version)', async () => {
            const testObject: ProjectObject = {
                tenantId: 'test-tenant',
                resourceType: 'document',
                resourceId: 'doc-1',
                version: 1,
                title: 'Test Document'
            };

            await useCase.createObject(testObject);

            // Delete should work with just the key (no version)
            const deleteResult = await useCase.deleteObject({
                tenantId: 'test-tenant',
                resourceType: 'document',
                resourceId: 'doc-1'
            });

            expect(deleteResult).toBe(true);

            // Verify object is gone
            const getResult = await useCase.getObject({
                tenantId: 'test-tenant',
                resourceType: 'document',
                resourceId: 'doc-1'
            });

            expect(getResult).toBeNull();
        });

        it('should return false when trying to delete non-existent object', async () => {
            const deleteResult = await useCase.deleteObject({
                tenantId: 'test-tenant',
                resourceType: 'document',
                resourceId: 'non-existent'
            });

            expect(deleteResult).toBe(false);
        });
    });
});