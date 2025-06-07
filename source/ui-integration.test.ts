/**
 * @jest-environment node
 */
import '@jest/globals';
import 'jest';
import { RepositoryFactory, DatabaseType } from './infrastructure/database/RepositoryFactory';
import { ProjectObjectUseCase } from './application/use-cases/ProjectObjectUseCase';
import { RestApiController } from './interface-adapters/controllers/RestApiController';
import { ProjectObject } from './domain/entities/ProjectObject';

describe('UI Integration Test', () => {
    let restController: RestApiController<ProjectObject>;

    beforeEach(() => {
        // Setup in-memory database for testing
        const repository = RepositoryFactory.create<ProjectObject>({
            type: DatabaseType.IN_MEMORY
        });
        const useCase = new ProjectObjectUseCase(repository);
        restController = new RestApiController(useCase);
    });

    describe('UI Core Functionality', () => {
        it('should create an object with dynamic fields like the UI does', async () => {
            const objectData: ProjectObject = {
                tenantId: 'demo-company',
                resourceType: 'document',
                resourceId: 'user-guide',
                version: 1,
                // Dynamic fields that the UI would add
                title: 'User Guide Documentation',
                isPublished: true,
                wordCount: 1250,
                publishedDate: '2024-01-15',
                tags: ['documentation', 'guide', 'tutorial'],
                metadata: { author: 'John Doe', department: 'Engineering' }
            };

            const result = await restController.createResourceByPath(
                objectData.tenantId,
                objectData.resourceType,
                objectData.resourceId,
                objectData
            );

            expect(result.status).toBe(201);
            expect(result.data).toMatchObject(objectData);
        });

        it('should load an object like the UI does', async () => {
            // First create an object
            const objectData: ProjectObject = {
                tenantId: 'test-company',
                resourceType: 'user',
                resourceId: 'jane-doe',
                version: 1,
                name: 'Jane Doe',
                email: 'jane.doe@example.com',
                isActive: true,
                age: 28
            };

            await restController.createResourceByPath(
                objectData.tenantId,
                objectData.resourceType,
                objectData.resourceId,
                objectData
            );

            // Then load it
            const result = await restController.getResourceByPath(
                objectData.tenantId,
                objectData.resourceType,
                objectData.resourceId
            );

            expect(result.status).toBe(200);
            expect(result.data).toMatchObject(objectData);
        });

        it('should search objects like the UI does', async () => {
            // Create multiple objects
            const objects = [
                {
                    tenantId: 'search-test',
                    resourceType: 'document',
                    resourceId: 'doc1',
                    version: 1,
                    title: 'Document 1'
                },
                {
                    tenantId: 'search-test',
                    resourceType: 'document',
                    resourceId: 'doc2',
                    version: 1,
                    title: 'Document 2'
                }
            ];

            for (const obj of objects) {
                await restController.createResourceByPath(
                    obj.tenantId,
                    obj.resourceType,
                    obj.resourceId,
                    obj
                );
            }

            // Search for them
            const searchResult = await restController.searchResourcesByPath(
                'search-test',
                'document'
            );

            expect(searchResult.status).toBe(200);
            expect(searchResult.data?.results).toHaveLength(2);
            expect(searchResult.data?.total).toBe(2);
        });

        it('should handle different field types like the UI does', async () => {
            const objectWithVariousTypes: ProjectObject = {
                tenantId: 'type-test',
                resourceType: 'mixed',
                resourceId: 'test-object',
                version: 1,
                // String field
                stringField: 'Hello World',
                // Number field
                numberField: 42,
                // Boolean field
                booleanField: true,
                // Date field (as string)
                dateField: '2024-01-15',
                // Array field
                arrayField: ['item1', 'item2', 'item3'],
                // JSON object field
                jsonField: { key: 'value', nested: { count: 10 } }
            };

            const result = await restController.createResourceByPath(
                objectWithVariousTypes.tenantId,
                objectWithVariousTypes.resourceType,
                objectWithVariousTypes.resourceId,
                objectWithVariousTypes
            );

            expect(result.status).toBe(201);
            expect(result.data).toMatchObject(objectWithVariousTypes);
            
            // Verify types are preserved
            expect(typeof result.data?.stringField).toBe('string');
            expect(typeof result.data?.numberField).toBe('number');
            expect(typeof result.data?.booleanField).toBe('boolean');
            expect(Array.isArray(result.data?.arrayField)).toBe(true);
            expect(typeof result.data?.jsonField).toBe('object');
        });

        it('should delete objects like the UI does', async () => {
            // Create an object
            const objectData: ProjectObject = {
                tenantId: 'delete-test',
                resourceType: 'temp',
                resourceId: 'temp-object',
                version: 1,
                title: 'Temporary Object'
            };

            await restController.createResourceByPath(
                objectData.tenantId,
                objectData.resourceType,
                objectData.resourceId,
                objectData
            );

            // Delete it
            const deleteResult = await restController.deleteResourceByPath(
                objectData.tenantId,
                objectData.resourceType,
                objectData.resourceId
            );

            expect(deleteResult.status).toBe(204);

            // Verify it's gone
            const getResult = await restController.getResourceByPath(
                objectData.tenantId,
                objectData.resourceType,
                objectData.resourceId
            );

            expect(getResult.status).toBe(404);
        });

        it('should create Schema using header-based endpoint like the updated Save button does', async () => {
            // This test validates the new Schema create functionality from issue #34
            const resourceId = 'user-guide-01';
            const tenantId = 'my-company';
            const resourceType = 'document';

            // Prepare body data like the UI does (without tenant/resource info)
            const bodyData = {
                version: 1,
                title: 'User Guide',
                content: 'Welcome to our system...',
                description: 'Comprehensive user guide for new users',
                status: 'active',
                metadata: {
                    author: 'John Doe',
                    category: 'documentation',
                    tags: ['guide', 'tutorial']
                }
            };

            const result = await restController.createResourceByIdWithHeaders(
                resourceId,
                tenantId,
                resourceType,
                bodyData
            );

            expect(result.status).toBe(201);
            expect(result.data).toMatchObject({
                ...bodyData,
                tenantId,
                resourceType,
                resourceId
            });

            // Verify the object was created correctly
            const getResult = await restController.getResourceByIdWithHeaders(
                resourceId,
                tenantId,
                resourceType
            );

            expect(getResult.status).toBe(200);
            expect(getResult.data).toMatchObject({
                ...bodyData,
                tenantId,
                resourceType,
                resourceId
            });
        });
    });
});