import { HttpRouter, demonstrateRestApi } from './RestApiExamples';

describe('RestApiExamples', () => {
    let router: HttpRouter;

    beforeEach(() => {
        router = new HttpRouter();
    });

    describe('HttpRouter', () => {
        it('should handle path-based GET request', async () => {
            // First create a resource
            await router.handleRequest({
                method: 'POST',
                path: '/tenants/test-tenant/resources/document/doc-1',
                params: { tenantId: 'test-tenant', resourceType: 'document', resourceId: 'doc-1' },
                headers: {},
                body: { title: 'Test Document' }
            });

            // Then get it
            const response = await router.handleRequest({
                method: 'GET',
                path: '/tenants/test-tenant/resources/document/doc-1',
                params: { tenantId: 'test-tenant', resourceType: 'document', resourceId: 'doc-1' },
                headers: {}
            });

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                tenantId: 'test-tenant',
                resourceType: 'document',
                resourceId: 'doc-1',
                title: 'Test Document'
            });
        });

        it('should handle header-based GET request', async () => {
            // First create a resource
            await router.handleRequest({
                method: 'POST',
                path: '/resources/doc-2',
                params: { resourceId: 'doc-2' },
                headers: { 
                    'X-Tenant-Id': 'test-tenant',
                    'X-Resource-Type': 'document'
                },
                body: { title: 'Test Document 2' }
            });

            // Then get it
            const response = await router.handleRequest({
                method: 'GET',
                path: '/resources/doc-2',
                params: { resourceId: 'doc-2' },
                headers: { 
                    'X-Tenant-Id': 'test-tenant',
                    'X-Resource-Type': 'document'
                }
            });

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                tenantId: 'test-tenant',
                resourceType: 'document',
                resourceId: 'doc-2',
                title: 'Test Document 2'
            });
        });

        it('should return 400 for missing headers in header-based endpoints', async () => {
            const response = await router.handleRequest({
                method: 'GET',
                path: '/resources/doc-3',
                params: { resourceId: 'doc-3' },
                headers: {}
            });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Missing required headers');
        });

        it('should return 404 for unknown routes', async () => {
            const response = await router.handleRequest({
                method: 'GET',
                path: '/unknown/route',
                params: {},
                headers: {}
            });

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Route not found');
        });

        it('should handle search requests', async () => {
            // Create some resources first
            await router.handleRequest({
                method: 'POST',
                path: '/tenants/search-tenant/resources/document/doc-a',
                params: { tenantId: 'search-tenant', resourceType: 'document', resourceId: 'doc-a' },
                headers: {},
                body: { title: 'Document A' }
            });

            await router.handleRequest({
                method: 'POST',
                path: '/tenants/search-tenant/resources/document/doc-b',
                params: { tenantId: 'search-tenant', resourceType: 'document', resourceId: 'doc-b' },
                headers: {},
                body: { title: 'Document B' }
            });

            // Search for them
            const response = await router.handleRequest({
                method: 'GET',
                path: '/tenants/search-tenant/resources/document',
                params: { tenantId: 'search-tenant', resourceType: 'document' },
                headers: {},
                query: { page: 1, limit: 10 }
            });

            expect(response.status).toBe(200);
            expect(response.body.results).toHaveLength(2);
            expect(response.body.total).toBe(2);
        });
    });

    describe('demonstrateRestApi', () => {
        it('should run without errors', async () => {
            // Mock console.log to avoid output during tests
            const originalLog = console.log;
            console.log = jest.fn();

            await expect(demonstrateRestApi()).resolves.not.toThrow();

            console.log = originalLog;
        });
    });
});