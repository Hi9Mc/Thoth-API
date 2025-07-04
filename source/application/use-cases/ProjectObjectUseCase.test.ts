import { ProjectObjectUseCase } from './ProjectObjectUseCase';
import { ProjectObject, ProjectObjectKey } from '../../domain/entities/ProjectObject';
import { ProjectObjectRepository } from '../../domain/repositories/ProjectObjectRepository';
import { SearchLogicalOperator, SearchConditionOperator } from '../../domain/entities/SearchCriteria';

describe('ProjectObjectUseCase', () => {
    let useCase: ProjectObjectUseCase;
    let mockRepository: jest.Mocked<ProjectObjectRepository>;

    const testObject: ProjectObject = {
        tenantId: 'test-project',
        resourceType: 'test-type',
        resourceId: 'test-id',
        version: 1,
        name: 'Test Object'
    };

    beforeEach(() => {
        mockRepository = {
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findByKey: jest.fn(),
            search: jest.fn(),
            exists: jest.fn(),
            count: jest.fn()
        };

        useCase = new ProjectObjectUseCase(mockRepository);
    });

    describe('createObject', () => {
        it('should create object successfully when it does not exist', async () => {
            mockRepository.findByKey.mockResolvedValue(null);
            mockRepository.create.mockResolvedValue(testObject);

            const result = await useCase.createObject(testObject);

            expect(result).toEqual(testObject);
            expect(mockRepository.findByKey).toHaveBeenCalledWith({
                tenantId: testObject.tenantId,
                resourceType: testObject.resourceType,
                resourceId: testObject.resourceId
            });
            expect(mockRepository.create).toHaveBeenCalledWith(testObject);
        });

        it('should throw error when object already exists', async () => {
            mockRepository.findByKey.mockResolvedValue(testObject);

            await expect(useCase.createObject(testObject)).rejects.toThrow(
                'Object with key test-project#test-type#test-id already exists. To update existing objects, use PUT instead of POST.'
            );

            expect(mockRepository.create).not.toHaveBeenCalled();
        });

        it('should validate object before creation', async () => {
            const invalidObject = { ...testObject, tenantId: '' };

            await expect(useCase.createObject(invalidObject)).rejects.toThrow(
                'TenantId is required and must be a string'
            );

            expect(mockRepository.findByKey).not.toHaveBeenCalled();
            expect(mockRepository.create).not.toHaveBeenCalled();
        });
    });

    describe('updateObject', () => {
        it('should update object successfully when it exists', async () => {
            mockRepository.findByKey.mockResolvedValue(testObject);
            const updatedObject = { ...testObject, version: 2 };
            mockRepository.update.mockResolvedValue(updatedObject);

            const result = await useCase.updateObject(updatedObject);

            expect(result).toEqual(updatedObject);
            expect(mockRepository.update).toHaveBeenCalledWith(updatedObject);
        });

        it('should throw error when object does not exist', async () => {
            mockRepository.findByKey.mockResolvedValue(null);

            await expect(useCase.updateObject(testObject)).rejects.toThrow(
                'Object with key test-project#test-type#test-id not found'
            );

            expect(mockRepository.update).not.toHaveBeenCalled();
        });
    });

    describe('deleteObject', () => {
        const key: ProjectObjectKey = {
            tenantId: 'test-project',
            resourceType: 'test-type',
            resourceId: 'test-id'
        };

        it('should delete object successfully when it exists', async () => {
            mockRepository.findByKey.mockResolvedValue(testObject);
            mockRepository.delete.mockResolvedValue(true);

            const result = await useCase.deleteObject(key);

            expect(result).toBe(true);
            expect(mockRepository.delete).toHaveBeenCalledWith(key);
        });

        it('should return false when object does not exist', async () => {
            mockRepository.findByKey.mockResolvedValue(null);

            const result = await useCase.deleteObject(key);

            expect(result).toBe(false);
            expect(mockRepository.delete).not.toHaveBeenCalled();
        });
    });

    describe('getObject', () => {
        it('should return object when it exists', async () => {
            const key: ProjectObjectKey = {
                tenantId: 'test-project',
                resourceType: 'test-type',
                resourceId: 'test-id'
            };

            mockRepository.findByKey.mockResolvedValue(testObject);

            const result = await useCase.getObject(key);

            expect(result).toEqual(testObject);
            expect(mockRepository.findByKey).toHaveBeenCalledWith(key);
        });

        it('should return null when object does not exist', async () => {
            const key: ProjectObjectKey = {
                tenantId: 'test-project',
                resourceType: 'test-type',
                resourceId: 'test-id'
            };

            mockRepository.findByKey.mockResolvedValue(null);

            const result = await useCase.getObject(key);

            expect(result).toBeNull();
        });
    });

    describe('searchObjects', () => {
        it('should search objects with default pagination', async () => {
            const condition = {
                logic: SearchLogicalOperator.AND,
                conditions: [
                    { key: 'projectId', value: 'test-project', operator: SearchConditionOperator.EQUALS }
                ]
            };

            const expectedResults = { results: [testObject], total: 1 };
            mockRepository.search.mockResolvedValue(expectedResults);

            const result = await useCase.searchObjects(condition, {});

            expect(result).toEqual(expectedResults);
            expect(mockRepository.search).toHaveBeenCalledWith(condition, {
                page: 1,
                limit: 20
            });
        });

        it('should search objects with custom pagination', async () => {
            const condition = {
                logic: SearchLogicalOperator.AND,
                conditions: [
                    { key: 'projectId', value: 'test-project', operator: SearchConditionOperator.EQUALS }
                ]
            };

            const pagination = { page: 2, limit: 10 };
            const expectedResults = { results: [testObject], total: 1 };
            mockRepository.search.mockResolvedValue(expectedResults);

            const result = await useCase.searchObjects(condition, pagination);

            expect(result).toEqual(expectedResults);
            expect(mockRepository.search).toHaveBeenCalledWith(condition, pagination);
        });
    });

    describe('validation', () => {
        it('should validate projectId', async () => {
            const invalidObject = { ...testObject, tenantId: null as any };

            await expect(useCase.createObject(invalidObject)).rejects.toThrow(
                'TenantId is required and must be a string'
            );
        });

        it('should validate contentType', async () => {
            const invalidObject = { ...testObject, resourceType: null as any };

            await expect(useCase.createObject(invalidObject)).rejects.toThrow(
                'ResourceType is required and must be a string'
            );
        });

        it('should validate contentId', async () => {
            const invalidObject = { ...testObject, resourceId: '' };

            await expect(useCase.createObject(invalidObject)).rejects.toThrow(
                'ResourceId is required and must be a string'
            );
        });

        it('should validate version', async () => {
            const invalidObject = { ...testObject, version: -1 };

            await expect(useCase.createObject(invalidObject)).rejects.toThrow(
                'Version is required and must be a non-negative number'
            );
        });
    });
});