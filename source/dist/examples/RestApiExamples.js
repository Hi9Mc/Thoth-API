"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpRouter = void 0;
exports.setupExpressRoutes = setupExpressRoutes;
exports.lambdaHandler = lambdaHandler;
exports.demonstrateRestApi = demonstrateRestApi;
const RestApiController_1 = require("../interface-adapters/controllers/RestApiController");
const ProjectObjectUseCase_1 = require("../application/use-cases/ProjectObjectUseCase");
const RepositoryFactory_1 = require("../infrastructure/database/RepositoryFactory");
/**
 * HTTP Router class that demonstrates the REST API endpoints
 */
class HttpRouter {
    constructor() {
        // Setup the controller with in-memory repository for demonstration
        const repository = RepositoryFactory_1.RepositoryFactory.create({
            type: RepositoryFactory_1.DatabaseType.IN_MEMORY
        });
        const useCase = new ProjectObjectUseCase_1.ProjectObjectUseCase(repository);
        this.restController = new RestApiController_1.RestApiController(useCase);
    }
    /**
     * Route handler for all HTTP requests
     */
    async handleRequest(request) {
        const { method, path, params, headers, body, query } = request;
        try {
            // Path-based endpoints: /tenants/{tenantId}/resources/{resourceType}/{resourceId}
            if (path.match(/^\/tenants\/[^\/]+\/resources\/[^\/]+\/[^\/]+$/)) {
                const { tenantId, resourceType, resourceId } = params;
                const version = (query === null || query === void 0 ? void 0 : query.version) ? parseInt(query.version) : 1;
                switch (method) {
                    case 'GET':
                        return this.toHttpResponse(await this.restController.getResourceByPath(tenantId, resourceType, resourceId));
                    case 'POST':
                        return this.toHttpResponse(await this.restController.createResourceByPath(tenantId, resourceType, resourceId, body));
                    case 'PUT':
                        return this.toHttpResponse(await this.restController.updateResourceByPath(tenantId, resourceType, resourceId, body));
                    case 'DELETE':
                        return this.toHttpResponse(await this.restController.deleteResourceByPath(tenantId, resourceType, resourceId));
                }
            }
            // Header-based endpoints: /resources/{resourceId}
            if (path.match(/^\/resources\/[^\/]+$/)) {
                const { resourceId } = params;
                const tenantId = headers['x-tenant-id'] || headers['X-Tenant-Id'];
                const resourceType = headers['x-resource-type'] || headers['X-Resource-Type'];
                const version = (query === null || query === void 0 ? void 0 : query.version) ? parseInt(query.version) : 1;
                if (!tenantId || !resourceType) {
                    return {
                        status: 400,
                        body: { error: 'Missing required headers: X-Tenant-Id and X-Resource-Type' }
                    };
                }
                switch (method) {
                    case 'GET':
                        return this.toHttpResponse(await this.restController.getResourceByIdWithHeaders(resourceId, tenantId, resourceType));
                    case 'POST':
                        return this.toHttpResponse(await this.restController.createResourceByIdWithHeaders(resourceId, tenantId, resourceType, body));
                    case 'PUT':
                        return this.toHttpResponse(await this.restController.updateResourceByIdWithHeaders(resourceId, tenantId, resourceType, body));
                    case 'DELETE':
                        return this.toHttpResponse(await this.restController.deleteResourceByIdWithHeaders(resourceId, tenantId, resourceType));
                }
            }
            // Search endpoint: /tenants/{tenantId}/resources/{resourceType}
            if (path.match(/^\/tenants\/[^\/]+\/resources\/[^\/]+$/) && method === 'GET') {
                const { tenantId, resourceType } = params;
                return this.toHttpResponse(await this.restController.searchResourcesByPath(tenantId, resourceType, query));
            }
            // Route not found
            return {
                status: 404,
                body: { error: 'Route not found' }
            };
        }
        catch (error) {
            return {
                status: 500,
                body: {
                    error: error instanceof Error ? error.message : 'Internal server error'
                }
            };
        }
    }
    toHttpResponse(controllerResponse) {
        const { status, data, error } = controllerResponse;
        return {
            status,
            headers: { 'Content-Type': 'application/json' },
            body: error ? { error } : data
        };
    }
}
exports.HttpRouter = HttpRouter;
/**
 * Example usage with Express.js style routing
 */
function setupExpressRoutes(app) {
    const router = new HttpRouter();
    // Path-based routes
    app.get('/tenants/:tenantId/resources/:resourceType/:resourceId', async (req, res) => {
        const response = await router.handleRequest({
            method: 'GET',
            path: req.path,
            params: req.params,
            headers: req.headers,
            query: req.query
        });
        res.status(response.status).json(response.body);
    });
    app.post('/tenants/:tenantId/resources/:resourceType/:resourceId', async (req, res) => {
        const response = await router.handleRequest({
            method: 'POST',
            path: req.path,
            params: req.params,
            headers: req.headers,
            body: req.body,
            query: req.query
        });
        res.status(response.status).json(response.body);
    });
    // Header-based routes
    app.get('/resources/:resourceId', async (req, res) => {
        const response = await router.handleRequest({
            method: 'GET',
            path: req.path,
            params: req.params,
            headers: req.headers,
            query: req.query
        });
        res.status(response.status).json(response.body);
    });
    // Add other routes as needed...
}
/**
 * Example usage with AWS Lambda
 */
async function lambdaHandler(event) {
    var _a, _b;
    const router = new HttpRouter();
    const request = {
        method: event.httpMethod || ((_b = (_a = event.requestContext) === null || _a === void 0 ? void 0 : _a.http) === null || _b === void 0 ? void 0 : _b.method),
        path: event.path || event.rawPath,
        params: event.pathParameters || {},
        headers: event.headers || {},
        body: event.body ? JSON.parse(event.body) : undefined,
        query: event.queryStringParameters || {}
    };
    const response = await router.handleRequest(request);
    return {
        statusCode: response.status,
        headers: response.headers || {},
        body: JSON.stringify(response.body)
    };
}
/**
 * Simple demonstration function
 */
async function demonstrateRestApi() {
    const router = new HttpRouter();
    console.log('=== REST API Demonstration ===\n');
    // Create a resource using path-based endpoint
    console.log('1. Creating resource via path-based endpoint:');
    const createRequest = {
        method: 'POST',
        path: '/tenants/demo-tenant/resources/document/doc-123',
        params: { tenantId: 'demo-tenant', resourceType: 'document', resourceId: 'doc-123' },
        headers: {},
        body: { title: 'Demo Document', content: 'This is a demo document' }
    };
    const createResponse = await router.handleRequest(createRequest);
    console.log('Response:', createResponse);
    // Get the resource using header-based endpoint
    console.log('\n2. Getting resource via header-based endpoint:');
    const getRequest = {
        method: 'GET',
        path: '/resources/doc-123',
        params: { resourceId: 'doc-123' },
        headers: {
            'X-Tenant-Id': 'demo-tenant',
            'X-Resource-Type': 'document'
        }
    };
    const getResponse = await router.handleRequest(getRequest);
    console.log('Response:', getResponse);
    // Search resources
    console.log('\n3. Searching resources:');
    const searchRequest = {
        method: 'GET',
        path: '/tenants/demo-tenant/resources/document',
        params: { tenantId: 'demo-tenant', resourceType: 'document' },
        headers: {},
        query: { page: 1, limit: 10 }
    };
    const searchResponse = await router.handleRequest(searchRequest);
    console.log('Response:', searchResponse);
}
// Uncomment to run demonstration
// demonstrateRestApi().catch(console.error);
