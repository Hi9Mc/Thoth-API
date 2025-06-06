import { RestApiController } from './RestApiController';
import { ProjectObject, ProjectObjectKey } from '../../domain/entities/ProjectObject';
import { ProjectObjectUseCase } from '../../application/use-cases/ProjectObjectUseCase';

describe('RestApiController', () => {
    let controller: RestApiController<ProjectObject>;
    let mockUseCase: jest.Mocked<ProjectObjectUseCase<ProjectObject>>;

    const testObject: ProjectObject = {
        tenantId: 'test-tenant',
        resourceType: 'document',
        resourceId: 'test-doc-1',
        version: 1,
        title: 'Test Document',
        content: 'Test content'
    };

    beforeEach(() => {
        mockUseCase = {
            createObject: jest.fn(),
            updateObject: jest.fn(),
            deleteObject: jest.fn(),
            getObject: jest.fn(),
            searchObjects: jest.fn(),
            objectExists: jest.fn(),
            countObjects: jest.fn()
        } as any;

        controller = new RestApiController(mockUseCase);
    });

    describe('Path-based endpoints (/tenants/{tenantId}/resources/{resourceType}/{resourceId})', () => {
        describe('GET', () => {
            it('should get resource successfully when it exists', async () => {
                mockUseCase.getObject.mockResolvedValue(testObject);

                const result = await controller.getResourceByPath('test-tenant', 'document', 'test-doc-1');

                expect(result.status).toBe(200);
                expect(result.data).toEqual(testObject);
                expect(mockUseCase.getObject).toHaveBeenCalledWith({
                    tenantId: 'test-tenant',
                    resourceType: 'document',
                    resourceId: 'test-doc-1'
                });
            });

            it('should return 404 when resource not found', async () => {
                mockUseCase.getObject.mockResolvedValue(null);

                const result = await controller.getResourceByPath('test-tenant', 'document', 'nonexistent');

                expect(result.status).toBe(404);
                expect(result.error).toBe('Resource not found');
            });

            it('should return 500 on internal error', async () => {
                mockUseCase.getObject.mockRejectedValue(new Error('Database error'));

                const result = await controller.getResourceByPath('test-tenant', 'document', 'test-doc-1');

                expect(result.status).toBe(500);
                expect(result.error).toBe('Database error');
            });
        });

        describe('POST', () => {
            it('should create resource successfully', async () => {
                const requestBody = { title: 'New Document', content: 'New content' };
                mockUseCase.createObject.mockResolvedValue({ ...testObject, ...requestBody });

                const result = await controller.createResourceByPath('test-tenant', 'document', 'test-doc-1', requestBody);

                expect(result.status).toBe(201);
                expect(result.data).toEqual({ ...testObject, ...requestBody });
                expect(mockUseCase.createObject).toHaveBeenCalledWith({
                    ...requestBody,
                    tenantId: 'test-tenant',
                    resourceType: 'document',
                    resourceId: 'test-doc-1'
                });
            });

            it('should handle creation errors', async () => {
                const requestBody = { title: 'New Document' };
                mockUseCase.createObject.mockRejectedValue(new Error('Validation error'));

                const result = await controller.createResourceByPath('test-tenant', 'document', 'test-doc-1', requestBody);

                expect(result.status).toBe(400);
                expect(result.error).toBe('Validation error');
            });
        });

        describe('PUT', () => {
            it('should update resource successfully', async () => {
                const requestBody = { title: 'Updated Document', version: 2 };
                const updatedObject = { ...testObject, ...requestBody };
                mockUseCase.updateObject.mockResolvedValue(updatedObject);

                const result = await controller.updateResourceByPath('test-tenant', 'document', 'test-doc-1', requestBody);

                expect(result.status).toBe(200);
                expect(result.data).toEqual(updatedObject);
                expect(mockUseCase.updateObject).toHaveBeenCalledWith({
                    ...requestBody,
                    tenantId: 'test-tenant',
                    resourceType: 'document',
                    resourceId: 'test-doc-1',
                    version: 2
                });
            });

            it('should return 404 when resource not found for update', async () => {
                const requestBody = { title: 'Updated Document', version: 2 };
                mockUseCase.updateObject.mockRejectedValue(new Error('Object with key test-tenant#document#test-doc-1 not found'));

                const result = await controller.updateResourceByPath('test-tenant', 'document', 'test-doc-1', requestBody);

                expect(result.status).toBe(404);
                expect(result.error).toContain('not found');
            });
        });

        describe('DELETE', () => {
            it('should delete resource successfully', async () => {
                mockUseCase.deleteObject.mockResolvedValue(true);

                const result = await controller.deleteResourceByPath('test-tenant', 'document', 'test-doc-1');

                expect(result.status).toBe(204);
                expect(mockUseCase.deleteObject).toHaveBeenCalledWith({
                    tenantId: 'test-tenant',
                    resourceType: 'document',
                    resourceId: 'test-doc-1'
                });
            });

            it('should return 404 when resource not found for deletion', async () => {
                mockUseCase.deleteObject.mockResolvedValue(false);

                const result = await controller.deleteResourceByPath('test-tenant', 'document', 'nonexistent');

                expect(result.status).toBe(404);
                expect(result.error).toBe('Resource not found');
            });
        });
    });

    describe('Header-based endpoints (/resources/{resourceId})', () => {
        describe('GET', () => {
            it('should get resource successfully with headers', async () => {
                mockUseCase.getObject.mockResolvedValue(testObject);

                const result = await controller.getResourceByIdWithHeaders('test-doc-1', 'test-tenant', 'document');

                expect(result.status).toBe(200);
                expect(result.data).toEqual(testObject);
                expect(mockUseCase.getObject).toHaveBeenCalledWith({
                    tenantId: 'test-tenant',
                    resourceType: 'document',
                    resourceId: 'test-doc-1'
                });
            });

            it('should return 404 when resource not found with headers', async () => {
                mockUseCase.getObject.mockResolvedValue(null);

                const result = await controller.getResourceByIdWithHeaders('nonexistent', 'test-tenant', 'document');

                expect(result.status).toBe(404);
                expect(result.error).toBe('Resource not found');
            });
        });

        describe('POST', () => {
            it('should create resource successfully with headers', async () => {
                const requestBody = { title: 'New Document', content: 'New content' };
                mockUseCase.createObject.mockResolvedValue({ ...testObject, ...requestBody });

                const result = await controller.createResourceByIdWithHeaders('test-doc-1', 'test-tenant', 'document', requestBody);

                expect(result.status).toBe(201);
                expect(result.data).toEqual({ ...testObject, ...requestBody });
                expect(mockUseCase.createObject).toHaveBeenCalledWith({
                    ...requestBody,
                    tenantId: 'test-tenant',
                    resourceType: 'document',
                    resourceId: 'test-doc-1'
                });
            });
        });

        describe('PUT', () => {
            it('should update resource successfully with headers', async () => {
                const requestBody = { title: 'Updated Document', version: 2 };
                const updatedObject = { ...testObject, ...requestBody };
                mockUseCase.updateObject.mockResolvedValue(updatedObject);

                const result = await controller.updateResourceByIdWithHeaders('test-doc-1', 'test-tenant', 'document', requestBody);

                expect(result.status).toBe(200);
                expect(result.data).toEqual(updatedObject);
                expect(mockUseCase.updateObject).toHaveBeenCalledWith({
                    ...requestBody,
                    tenantId: 'test-tenant',
                    resourceType: 'document',
                    resourceId: 'test-doc-1',
                    version: 2
                });
            });
        });

        describe('DELETE', () => {
            it('should delete resource successfully with headers', async () => {
                mockUseCase.deleteObject.mockResolvedValue(true);

                const result = await controller.deleteResourceByIdWithHeaders('test-doc-1', 'test-tenant', 'document');

                expect(result.status).toBe(204);
                expect(mockUseCase.deleteObject).toHaveBeenCalledWith({
                    tenantId: 'test-tenant',
                    resourceType: 'document',
                    resourceId: 'test-doc-1'
                });
            });

            it('should return 404 when resource not found for deletion with headers', async () => {
                mockUseCase.deleteObject.mockResolvedValue(false);

                const result = await controller.deleteResourceByIdWithHeaders('nonexistent', 'test-tenant', 'document');

                expect(result.status).toBe(404);
                expect(result.error).toBe('Resource not found');
            });
        });
    });

    describe('Search endpoints', () => {
        it('should search resources by tenant and type', async () => {
            const searchResults = {
                results: [testObject],
                total: 1
            };
            mockUseCase.searchObjects.mockResolvedValue(searchResults);

            const result = await controller.searchResourcesByPath('test-tenant', 'document', { page: 1, limit: 10 });

            expect(result.status).toBe(200);
            expect(result.data).toEqual(searchResults);
            expect(mockUseCase.searchObjects).toHaveBeenCalledWith(
                expect.objectContaining({
                    logic: 'AND',
                    conditions: expect.arrayContaining([
                        { key: 'tenantId', value: 'test-tenant', operator: '=' },
                        { key: 'resourceType', value: 'document', operator: '=' }
                    ])
                }),
                expect.objectContaining({
                    page: 1,
                    limit: 10
                })
            );
        });

        it('should handle search errors', async () => {
            mockUseCase.searchObjects.mockRejectedValue(new Error('Search failed'));

            const result = await controller.searchResourcesByPath('test-tenant', 'document');

            expect(result.status).toBe(500);
            expect(result.error).toBe('Search failed');
        });
    });

    describe('Version handling', () => {
        it('should not include version in get requests', async () => {
            mockUseCase.getObject.mockResolvedValue(testObject);

            await controller.getResourceByPath('test-tenant', 'document', 'test-doc-1');

            expect(mockUseCase.getObject).toHaveBeenCalledWith(
                expect.objectContaining({ 
                    tenantId: 'test-tenant',
                    resourceType: 'document',
                    resourceId: 'test-doc-1'
                })
            );
            expect(mockUseCase.getObject).toHaveBeenCalledWith(
                expect.not.objectContaining({ version: expect.anything() })
            );
        });

        it('should use version from request body when provided', async () => {
            const requestBody = { title: 'Document', version: 3 };
            mockUseCase.createObject.mockResolvedValue({ ...testObject, ...requestBody });

            await controller.createResourceByPath('test-tenant', 'document', 'test-doc-1', requestBody);

            expect(mockUseCase.createObject).toHaveBeenCalledWith(
                expect.objectContaining({ version: 3 })
            );
        });
    });

    describe('Error handling consistency', () => {
        it('should handle unknown errors gracefully', async () => {
            mockUseCase.getObject.mockRejectedValue('Unknown error');

            const result = await controller.getResourceByPath('test-tenant', 'document', 'test-doc-1');

            expect(result.status).toBe(500);
            expect(result.error).toBe('Internal server error');
        });

        it('should handle validation errors in creation', async () => {
            mockUseCase.createObject.mockRejectedValue(new Error('TenantId is required'));

            const result = await controller.createResourceByPath('', 'document', 'test-doc-1', {});

            expect(result.status).toBe(400);
            expect(result.error).toBe('TenantId is required');
        });
    });
});