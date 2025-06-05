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
                projectId: 'test-project-123',
                contentType: 'document',
                contentId: 'doc-456',
                version: 1,
                title: 'Test Document',
                content: 'This is test content'
            };

            expect(projectObject.projectId).toBe('test-project-123');
            expect(projectObject.contentType).toBe('document');
            expect(projectObject.contentId).toBe('doc-456');
            expect(projectObject.version).toBe(1);
            expect(projectObject.title).toBe('Test Document');
            expect(projectObject.content).toBe('This is test content');
        });

        it('should allow additional properties through index signature', () => {
            const projectObject: ProjectObject = {
                projectId: 'test-project-123',
                contentType: 'document',
                contentId: 'doc-456',
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
                projectId: 'test-project-123',
                contentType: 'document',
                contentId: 'doc-456',
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
                projectId: 'test-project-123',
                contentType: 'document',
                contentId: 'doc-456',
                version: 1
            };

            expect(key.projectId).toBe('test-project-123');
            expect(key.contentType).toBe('document');
            expect(key.contentId).toBe('doc-456');
            expect(key.version).toBe(1);

            // Ensure no additional properties
            expect(Object.keys(key)).toEqual(['projectId', 'contentType', 'contentId', 'version']);
        });

        it('should be extractable from ProjectObject', () => {
            const projectObject: ProjectObject = {
                projectId: 'test-project-123',
                contentType: 'document',
                contentId: 'doc-456',
                version: 1,
                title: 'Test Document',
                additionalData: 'extra'
            };

            const key: ProjectObjectKey = {
                projectId: projectObject.projectId,
                contentType: projectObject.contentType,
                contentId: projectObject.contentId,
                version: projectObject.version
            };

            expect(key.projectId).toBe(projectObject.projectId);
            expect(key.contentType).toBe(projectObject.contentType);
            expect(key.contentId).toBe(projectObject.contentId);
            expect(key.version).toBe(projectObject.version);
        });

        it('should work with different version numbers', () => {
            const key1: ProjectObjectKey = {
                projectId: 'test-project',
                contentType: 'document',
                contentId: 'doc-123',
                version: 0
            };

            const key2: ProjectObjectKey = {
                projectId: 'test-project',
                contentType: 'document',
                contentId: 'doc-123',
                version: 999
            };

            expect(key1.version).toBe(0);
            expect(key2.version).toBe(999);
        });
    });

    describe('Type Safety', () => {
        it('should enforce string types for IDs', () => {
            const projectObject: ProjectObject = {
                projectId: '123',
                contentType: 'document',
                contentId: 'doc-456',
                version: 1
            };

            // These should be strings
            expect(typeof projectObject.projectId).toBe('string');
            expect(typeof projectObject.contentType).toBe('string');
            expect(typeof projectObject.contentId).toBe('string');
        });

        it('should enforce number type for version', () => {
            const projectObject: ProjectObject = {
                projectId: 'test-project-123',
                contentType: 'document',
                contentId: 'doc-456',
                version: 42
            };

            expect(typeof projectObject.version).toBe('number');
            expect(Number.isInteger(projectObject.version)).toBe(true);
        });
    });
});