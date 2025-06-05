/**
 * @jest-environment node
 */
import '@jest/globals';
import 'jest';
import { ProjectObject, ProjectObjectKey } from './ProjectObject';

describe('ProjectObject Domain Entity', () => {
    describe('ProjectObject Interface', () => {
        it('should enforce required properties', () => {
            const projectObject: ProjectObject = {
                tenantId: 'test-project-123',
                resourceType: 'document',
                resourceId: 'doc-456',
                version: 1,
                title: 'Test Document',
                content: 'This is test content'
            };

            expect(projectObject.tenantId).toBe('test-project-123');
            expect(projectObject.resourceType).toBe('document');
            expect(projectObject.resourceId).toBe('doc-456');
            expect(projectObject.version).toBe(1);
            expect(projectObject.title).toBe('Test Document');
            expect(projectObject.content).toBe('This is test content');
        });

        it('should allow additional properties through index signature', () => {
            const projectObject: ProjectObject = {
                tenantId: 'test-project-123',
                resourceType: 'document',
                resourceId: 'doc-456',
                version: 1,
                customField: 'custom value',
                metadata: {
                    createdBy: 'user123',
                    tags: ['important', 'draft']
                }
            };

            expect(projectObject['customField']).toBe('custom value');
            expect(projectObject['metadata']).toEqual({
                createdBy: 'user123',
                tags: ['important', 'draft']
            });
        });

        it('should handle different data types in additional properties', () => {
            const projectObject: ProjectObject = {
                tenantId: 'test-project-123',
                resourceType: 'document',
                resourceId: 'doc-456',
                version: 1,
                isPublished: true,
                viewCount: 100,
                tags: ['tag1', 'tag2'],
                createdAt: new Date('2023-01-01'),
                metadata: {
                    nested: {
                        value: 'deep value'
                    }
                }
            };

            expect(typeof projectObject.isPublished).toBe('boolean');
            expect(typeof projectObject.viewCount).toBe('number');
            expect(Array.isArray(projectObject.tags)).toBe(true);
            expect(projectObject.createdAt instanceof Date).toBe(true);
            expect(typeof projectObject.metadata).toBe('object');
        });
    });

    describe('ProjectObjectKey Interface', () => {
        it('should only contain key properties', () => {
            const key: ProjectObjectKey = {
                tenantId: 'test-project-123',
                resourceType: 'document',
                resourceId: 'doc-456',
                version: 1
            };

            expect(key.tenantId).toBe('test-project-123');
            expect(key.resourceType).toBe('document');
            expect(key.resourceId).toBe('doc-456');
            expect(key.version).toBe(1);

            // Ensure no additional properties
            expect(Object.keys(key)).toEqual(['tenantId', 'resourceType', 'resourceId', 'version']);
        });

        it('should be extractable from ProjectObject', () => {
            const projectObject: ProjectObject = {
                tenantId: 'test-project-123',
                resourceType: 'document',
                resourceId: 'doc-456',
                version: 1,
                title: 'Test Document',
                additionalData: 'extra'
            };

            const key: ProjectObjectKey = {
                tenantId: projectObject.tenantId,
                resourceType: projectObject.resourceType,
                resourceId: projectObject.resourceId,
                version: projectObject.version
            };

            expect(key.tenantId).toBe(projectObject.tenantId);
            expect(key.resourceType).toBe(projectObject.resourceType);
            expect(key.resourceId).toBe(projectObject.resourceId);
            expect(key.version).toBe(projectObject.version);
        });

        it('should work with different version numbers', () => {
            const key1: ProjectObjectKey = {
                tenantId: 'test-project',
                resourceType: 'document',
                resourceId: 'doc-123',
                version: 0
            };

            const key2: ProjectObjectKey = {
                tenantId: 'test-project',
                resourceType: 'document',
                resourceId: 'doc-123',
                version: 999
            };

            expect(key1.version).toBe(0);
            expect(key2.version).toBe(999);
        });
    });

    describe('Type Safety', () => {
        it('should enforce string types for IDs', () => {
            const projectObject: ProjectObject = {
                tenantId: '123',
                resourceType: 'document',
                resourceId: 'doc-456',
                version: 1
            };

            // These should be strings
            expect(typeof projectObject.tenantId).toBe('string');
            expect(typeof projectObject.resourceType).toBe('string');
            expect(typeof projectObject.resourceId).toBe('string');
        });

        it('should enforce number type for version', () => {
            const projectObject: ProjectObject = {
                tenantId: 'test-project-123',
                resourceType: 'document',
                resourceId: 'doc-456',
                version: 42
            };

            expect(typeof projectObject.version).toBe('number');
            expect(Number.isInteger(projectObject.version)).toBe(true);
        });
    });
});