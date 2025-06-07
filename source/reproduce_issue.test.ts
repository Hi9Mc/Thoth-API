import { ProjectObject } from '../source/domain/entities/ProjectObject';
import { ProjectObjectUseCase } from '../source/application/use-cases/ProjectObjectUseCase';
import { RepositoryFactory, DatabaseType } from '../source/infrastructure/database/RepositoryFactory';

describe('Reproduce Update Issue', () => {
    let useCase: ProjectObjectUseCase<ProjectObject>;

    beforeEach(() => {
        const repository = RepositoryFactory.create<ProjectObject>({ type: DatabaseType.IN_MEMORY });
        useCase = new ProjectObjectUseCase(repository);
    });

    it('should reproduce the issue described in the problem statement', async () => {
        // First, create an object (version 1)
        const initialObject: ProjectObject = {
            tenantId: 'demo-company',
            resourceType: 'document',
            resourceId: 'user-guide1',
            version: 1,
            title: 'User Guide Documentation',
            isPublished: true,
            wordCount: 1250,
            publishedDate: '2024-01-15',
            tags: ['documentation', 'guide', 'tutorial'],
            metadata: {
                author: 'John Doe',
                department: 'Engineering'
            }
        };

        const created = await useCase.createObject(initialObject);
        expect(created.version).toBe(1);

        // Now try to update with version 2 (this should work, not fail)
        const updateObject: ProjectObject = {
            tenantId: 'demo-company',
            resourceType: 'document',
            resourceId: 'user-guide1',
            version: 2,
            title: 'User Guide Documentation',
            isPublished: true,
            wordCount: 1250,
            publishedDate: '2024-01-15',
            tags: ['documentation', 'guide', 'tutorial'],
            metadata: {
                author: 'John Doe',
                department: 'Engineering'
            }
        };

        // This should work, not throw an "already exists" error
        const updated = await useCase.updateObject(updateObject);
        expect(updated.version).toBe(2);
    });

    it('should reproduce the exact error if calling create instead of update', async () => {
        // First, create an object (version 1)
        const initialObject: ProjectObject = {
            tenantId: 'demo-company',
            resourceType: 'document',
            resourceId: 'user-guide1',
            version: 1,
            title: 'User Guide Documentation'
        };

        const created = await useCase.createObject(initialObject);
        expect(created.version).toBe(1);

        // Now try to call create again with version 2 - this should fail with "already exists"
        const createObject: ProjectObject = {
            tenantId: 'demo-company',
            resourceType: 'document',
            resourceId: 'user-guide1',
            version: 2,
            title: 'User Guide Documentation'
        };

        // This should throw the exact error message from the issue
        await expect(useCase.createObject(createObject)).rejects.toThrow(
            'Object with key demo-company#document#user-guide1 already exists'
        );
    });
});