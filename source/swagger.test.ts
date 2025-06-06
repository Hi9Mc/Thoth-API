import request from 'supertest';
import express from 'express';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import * as swaggerDocument from './swagger.json';

describe('Swagger Documentation', () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
            customCss: '.swagger-ui .topbar { display: none }',
            customSiteTitle: 'Thoth API Documentation'
        }));
    });

    describe('Swagger UI', () => {
        it('should serve Swagger UI at /api-docs', async () => {
            const response = await request(app)
                .get('/api-docs/')
                .expect(200);

            expect(response.text).toContain('Thoth API Documentation');
            expect(response.text).toContain('swagger-ui');
        });

        it('should redirect /api-docs to /api-docs/', async () => {
            const response = await request(app)
                .get('/api-docs')
                .expect(301);
                
            expect(response.headers.location).toBe('/api-docs/');
        });
    });

    describe('OpenAPI Specification', () => {
        it('should have valid OpenAPI structure', () => {
            expect(swaggerDocument).toHaveProperty('openapi');
            expect(swaggerDocument).toHaveProperty('info');
            expect(swaggerDocument).toHaveProperty('paths');
            expect(swaggerDocument).toHaveProperty('components');
            
            expect(swaggerDocument.openapi).toBe('3.0.0');
            expect(swaggerDocument.info.title).toBe('Thoth Database System API');
            expect(swaggerDocument.info.version).toBe('1.0.0');
        });

        it('should document all required endpoints', () => {
            const paths = swaggerDocument.paths;

            // System endpoints
            expect(paths).toHaveProperty('/health');
            expect(paths).toHaveProperty('/');

            // Path-based endpoints
            expect(paths).toHaveProperty('/tenants/{tenantId}/resources/{resourceType}/{resourceId}');
            expect(paths).toHaveProperty('/tenants/{tenantId}/resources/{resourceType}');

            // Header-based endpoints
            expect(paths).toHaveProperty('/resources/{resourceId}');
        });

        it('should have proper HTTP methods for each endpoint', () => {
            const resourcePathEndpoint = swaggerDocument.paths['/tenants/{tenantId}/resources/{resourceType}/{resourceId}'];
            expect(resourcePathEndpoint).toHaveProperty('get');
            expect(resourcePathEndpoint).toHaveProperty('post');
            expect(resourcePathEndpoint).toHaveProperty('put');
            expect(resourcePathEndpoint).toHaveProperty('delete');

            const headerResourceEndpoint = swaggerDocument.paths['/resources/{resourceId}'];
            expect(headerResourceEndpoint).toHaveProperty('get');
            expect(headerResourceEndpoint).toHaveProperty('post');
            expect(headerResourceEndpoint).toHaveProperty('put');
            expect(headerResourceEndpoint).toHaveProperty('delete');
        });

        it('should define proper schemas', () => {
            const components = swaggerDocument.components;
            expect(components).toHaveProperty('schemas');
            expect(components.schemas).toHaveProperty('ProjectObject');
            expect(components.schemas).toHaveProperty('ProjectObjectInput');
            expect(components.schemas).toHaveProperty('Error');

            const projectObjectSchema = components.schemas.ProjectObject;
            expect(projectObjectSchema.required).toContain('tenantId');
            expect(projectObjectSchema.required).toContain('resourceType');
            expect(projectObjectSchema.required).toContain('resourceId');
            expect(projectObjectSchema.required).toContain('version');
        });

        it('should have proper tags for organization', () => {
            expect(swaggerDocument.tags).toHaveLength(3);
            const tagNames = swaggerDocument.tags.map(tag => tag.name);
            expect(tagNames).toContain('System');
            expect(tagNames).toContain('Path-based Resources');
            expect(tagNames).toContain('Header-based Resources');
        });
    });
});