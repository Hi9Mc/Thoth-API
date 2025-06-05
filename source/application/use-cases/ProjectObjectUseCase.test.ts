import { ProjectObjectUseCase } from './ProjectObjectUseCase';
import { ProjectObject, ProjectObjectKey } from '../../domain/entities/ProjectObject';
import { ProjectObjectRepository } from '../../domain/repositories/ProjectObjectRepository';
import { SearchLogicalOperator, SearchConditionOperator } from '../../domain/entities/SearchCriteria';

describe('ProjectObjectUseCase', () => {
    let useCase: ProjectObjectUseCase;
    let mockRepository: jest.Mocked<ProjectObjectRepository>;

    const testObject: ProjectObject = {
        projectId: 'test-project',
        contentType: 'test-type',
        contentId: 'test-id',
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
                projectId: testObject.projectId,
                contentType: testObject.contentType,
                contentId: testObject.contentId,
                version: testObject.version
            });
            expect(mockRepository.create).toHaveBeenCalledWith(testObject);
        });

        it('should throw error when object already exists', async () => {
            mockRepository.findByKey.mockResolvedValue(testObject);

            await expect(useCase.createObject(testObject)).rejects.toThrow(
                'Object with key test-project#test-type#test-id#1 already exists'
            );

            expect(mockRepository.create).not.toHaveBeenCalled();
        });

        it('should validate object before creation', async () => {
            const invalidObject = { ...testObject, projectId: '' };

            await expect(useCase.createObject(invalidObject)).rejects.toThrow(
                'ProjectId is required and must be a string'
            );

            expect(mockRepository.findByKey).not.toHaveBeenCalled();
            expect(mockRepository.create).not.toHaveBeenCalled();
        });
    });

    describe('updateObject', () => {
        it('should update object successfully when it exists', async () => {
            mockRepository.findByKey.mockResolvedValue(testObject);
            mockRepository.update.mockResolvedValue(testObject);

            const result = await useCase.updateObject(testObject);

            expect(result).toEqual(testObject);
            expect(mockRepository.update).toHaveBeenCalledWith(testObject);
        });

        it('should throw error when object does not exist', async () => {
            mockRepository.findByKey.mockResolvedValue(null);

            await expect(useCase.updateObject(testObject)).rejects.toThrow(
                'Object with key test-project#test-type#test-id#1 not found'
            );

            expect(mockRepository.update).not.toHaveBeenCalled();
        });
    });

    describe('deleteObject', () => {
        const key: ProjectObjectKey = {
            projectId: 'test-project',
            contentType: 'test-type',
            contentId: 'test-id',
            version: 1
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
                projectId: 'test-project',
                contentType: 'test-type',
                contentId: 'test-id',
                version: 1
            };

            mockRepository.findByKey.mockResolvedValue(testObject);

            const result = await useCase.getObject(key);

            expect(result).toEqual(testObject);
            expect(mockRepository.findByKey).toHaveBeenCalledWith(key);
        });

        it('should return null when object does not exist', async () => {
            const key: ProjectObjectKey = {
                projectId: 'test-project',
                contentType: 'test-type',
                contentId: 'test-id',
                version: 1
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
            const invalidObject = { ...testObject, projectId: null as any };

            await expect(useCase.createObject(invalidObject)).rejects.toThrow(
                'ProjectId is required and must be a string'
            );
        });

        it('should validate contentType', async () => {
            const invalidObject = { ...testObject, contentType: null as any };

            await expect(useCase.createObject(invalidObject)).rejects.toThrow(
                'ContentType is required and must be a string'
            );
        });

        it('should validate contentId', async () => {
            const invalidObject = { ...testObject, contentId: '' };

            await expect(useCase.createObject(invalidObject)).rejects.toThrow(
                'ContentId is required and must be a string'
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