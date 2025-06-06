"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const RestApiController_1 = require("./interface-adapters/controllers/RestApiController");
const ProjectObjectUseCase_1 = require("./application/use-cases/ProjectObjectUseCase");
const RepositoryFactory_1 = require("./infrastructure/database/RepositoryFactory");
const app = (0, express_1.default)();
const port = parseInt(process.env.PORT || '3000', 10);
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// CORS middleware for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Tenant-Id, X-Resource-Type');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    }
    else {
        next();
    }
});
// Initialize the REST API controller
let restController;
async function initializeController() {
    try {
        // Determine database type from environment
        const databaseType = process.env.DATABASE_TYPE || 'IN_MEMORY';
        let dbType;
        switch (databaseType.toUpperCase()) {
            case 'MONGODB':
                dbType = RepositoryFactory_1.DatabaseType.MONGODB;
                break;
            case 'DYNAMODB':
                dbType = RepositoryFactory_1.DatabaseType.DYNAMODB;
                break;
            default:
                dbType = RepositoryFactory_1.DatabaseType.IN_MEMORY;
        }
        // Configure database connection options
        const repositoryOptions = { type: dbType };
        if (dbType === RepositoryFactory_1.DatabaseType.MONGODB) {
            repositoryOptions.connectionString = process.env.MONGODB_URI || 'mongodb://root:password@mongodb:27017/thoth?authSource=admin';
        }
        else if (dbType === RepositoryFactory_1.DatabaseType.DYNAMODB) {
            repositoryOptions.region = process.env.AWS_REGION || 'us-east-1';
            repositoryOptions.endpoint = process.env.DYNAMODB_ENDPOINT || 'http://dynamodb-local:8000';
            repositoryOptions.tableName = process.env.DYNAMODB_TABLE || 'thoth-objects';
        }
        const repository = RepositoryFactory_1.RepositoryFactory.create(repositoryOptions);
        const useCase = new ProjectObjectUseCase_1.ProjectObjectUseCase(repository);
        restController = new RestApiController_1.RestApiController(useCase);
        console.log(`Initialized with ${databaseType} database`);
    }
    catch (error) {
        console.error('Failed to initialize controller:', error);
        // Fallback to in-memory for development
        const repository = RepositoryFactory_1.RepositoryFactory.create({ type: RepositoryFactory_1.DatabaseType.IN_MEMORY });
        const useCase = new ProjectObjectUseCase_1.ProjectObjectUseCase(repository);
        restController = new RestApiController_1.RestApiController(useCase);
        console.log('Fallback to IN_MEMORY database');
    }
}
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: process.env.DATABASE_TYPE || 'IN_MEMORY'
    });
});
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Thoth Database System API',
        version: '1.0.0',
        endpoints: {
            'GET /health': 'Health check',
            'GET|POST|PUT|DELETE /tenants/{tenantId}/resources/{resourceType}/{resourceId}': 'Path-based resource operations',
            'GET|POST|PUT|DELETE /resources/{resourceId}': 'Header-based resource operations (requires X-Tenant-Id and X-Resource-Type headers)',
            'GET /tenants/{tenantId}/resources/{resourceType}': 'Search resources by tenant and type'
        }
    });
});
// Path-based endpoints: /tenants/{tenantId}/resources/{resourceType}/{resourceId}
app.get('/tenants/:tenantId/resources/:resourceType/:resourceId', async (req, res) => {
    try {
        const { tenantId, resourceType, resourceId } = req.params;
        const version = req.query.version ? parseInt(req.query.version) : 1;
        const response = await restController.getResourceByPath(tenantId, resourceType, resourceId, version);
        res.status(response.status).json(response.data || { error: response.error });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/tenants/:tenantId/resources/:resourceType/:resourceId', async (req, res) => {
    try {
        const { tenantId, resourceType, resourceId } = req.params;
        const response = await restController.createResourceByPath(tenantId, resourceType, resourceId, req.body);
        res.status(response.status).json(response.data || { error: response.error });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.put('/tenants/:tenantId/resources/:resourceType/:resourceId', async (req, res) => {
    try {
        const { tenantId, resourceType, resourceId } = req.params;
        const response = await restController.updateResourceByPath(tenantId, resourceType, resourceId, req.body);
        res.status(response.status).json(response.data || { error: response.error });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.delete('/tenants/:tenantId/resources/:resourceType/:resourceId', async (req, res) => {
    try {
        const { tenantId, resourceType, resourceId } = req.params;
        const version = req.query.version ? parseInt(req.query.version) : 1;
        const response = await restController.deleteResourceByPath(tenantId, resourceType, resourceId, version);
        res.status(response.status).json(response.error ? { error: response.error } : {});
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Header-based endpoints: /resources/{resourceId}
app.get('/resources/:resourceId', async (req, res) => {
    try {
        const { resourceId } = req.params;
        const tenantId = req.headers['x-tenant-id'];
        const resourceType = req.headers['x-resource-type'];
        const version = req.query.version ? parseInt(req.query.version) : 1;
        if (!tenantId || !resourceType) {
            return res.status(400).json({ error: 'Missing required headers: X-Tenant-Id and X-Resource-Type' });
        }
        const response = await restController.getResourceByIdWithHeaders(resourceId, tenantId, resourceType, version);
        res.status(response.status).json(response.data || { error: response.error });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/resources/:resourceId', async (req, res) => {
    try {
        const { resourceId } = req.params;
        const tenantId = req.headers['x-tenant-id'];
        const resourceType = req.headers['x-resource-type'];
        if (!tenantId || !resourceType) {
            return res.status(400).json({ error: 'Missing required headers: X-Tenant-Id and X-Resource-Type' });
        }
        const response = await restController.createResourceByIdWithHeaders(resourceId, tenantId, resourceType, req.body);
        res.status(response.status).json(response.data || { error: response.error });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.put('/resources/:resourceId', async (req, res) => {
    try {
        const { resourceId } = req.params;
        const tenantId = req.headers['x-tenant-id'];
        const resourceType = req.headers['x-resource-type'];
        if (!tenantId || !resourceType) {
            return res.status(400).json({ error: 'Missing required headers: X-Tenant-Id and X-Resource-Type' });
        }
        const response = await restController.updateResourceByIdWithHeaders(resourceId, tenantId, resourceType, req.body);
        res.status(response.status).json(response.data || { error: response.error });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.delete('/resources/:resourceId', async (req, res) => {
    try {
        const { resourceId } = req.params;
        const tenantId = req.headers['x-tenant-id'];
        const resourceType = req.headers['x-resource-type'];
        const version = req.query.version ? parseInt(req.query.version) : 1;
        if (!tenantId || !resourceType) {
            return res.status(400).json({ error: 'Missing required headers: X-Tenant-Id and X-Resource-Type' });
        }
        const response = await restController.deleteResourceByIdWithHeaders(resourceId, tenantId, resourceType, version);
        res.status(response.status).json(response.error ? { error: response.error } : {});
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Search endpoint: /tenants/{tenantId}/resources/{resourceType}
app.get('/tenants/:tenantId/resources/:resourceType', async (req, res) => {
    try {
        const { tenantId, resourceType } = req.params;
        const response = await restController.searchResourcesByPath(tenantId, resourceType, req.query);
        res.status(response.status).json(response.data || { error: response.error });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Start server
async function startServer() {
    await initializeController();
    app.listen(port, '0.0.0.0', () => {
        console.log(`Thoth API Server running on port ${port}`);
        console.log(`Health check: http://localhost:${port}/health`);
        console.log(`API documentation: http://localhost:${port}/`);
    });
}
// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});
startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
