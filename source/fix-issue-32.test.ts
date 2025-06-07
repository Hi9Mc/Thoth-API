import { ProjectObject } from '../source/domain/entities/ProjectObject';
import { ProjectObjectUseCase } from '../source/application/use-cases/ProjectObjectUseCase';
import { RestApiController } from '../source/interface-adapters/controllers/RestApiController';
import { RepositoryFactory, DatabaseType } from '../source/infrastructure/database/RepositoryFactory';

describe('Fix for Issue #32 - Update data error', () => {
    let useCase: ProjectObjectUseCase<ProjectObject>;
    let controller: RestApiController<ProjectObject>;

    beforeEach(() => {
        const repository = RepositoryFactory.create<ProjectObject>({ type: DatabaseType.IN_MEMORY });
        useCase = new ProjectObjectUseCase(repository);
        controller = new RestApiController(useCase);
    });

    it('should guide users to use PUT instead of POST for updates', async () => {
        // Step 1: Create initial object (version 1)
        const createResult = await controller.createResourceByPath('demo-company', 'document', 'user-guide1', {
            title: "User Guide Documentation",
            isPublished: true,
            wordCount: 1250,
            publishedDate: "2024-01-15",
            tags: ["documentation", "guide", "tutorial"],
            metadata: {
                author: "John Doe",
                department: "Engineering"
            }
        });
        
        expect(createResult.status).toBe(201);
        expect(createResult.data?.version).toBe(1);

        // Step 2: User incorrectly tries POST with version 2 (reproduces the issue)
        const incorrectPostResult = await controller.createResourceByPath('demo-company', 'document', 'user-guide1', {
            tenantId: "demo-company",
            resourceType: "document", 
            resourceId: "user-guide1",
            version: 2,
            title: "User Guide Documentation",
            isPublished: true,
            wordCount: 1250,
            publishedDate: "2024-01-15",
            tags: ["documentation","guide","tutorial"],
            metadata: {"author":"John Doe","department":"Engineering"}
        });
        
        // Now the error is more helpful
        expect(incorrectPostResult.status).toBe(400);
        expect(incorrectPostResult.error).toContain('To update existing objects, use PUT instead of POST');
        expect(incorrectPostResult.error).toContain('Current version is 1, use version 2 for updates');

        // Step 3: User correctly uses PUT for update
        const correctPutResult = await controller.updateResourceByPath('demo-company', 'document', 'user-guide1', {
            version: 2,
            title: "User Guide Documentation",
            isPublished: true,
            wordCount: 1250,
            publishedDate: "2024-01-15",
            tags: ["documentation","guide","tutorial"],
            metadata: {"author":"John Doe","department":"Engineering"}
        });
        
        expect(correctPutResult.status).toBe(200);
        expect(correctPutResult.data?.version).toBe(2);
    });
});