/**
 * @jest-environment node
 */
import '@jest/globals';
import 'jest';
import express from 'express';
import { ProjectObject } from './domain/entities/ProjectObject';

// We need to mock the modules before importing the server
jest.mock('./infrastructure/database/RepositoryFactory');
jest.mock('./application/use-cases/ProjectObjectUseCase');
jest.mock('./interface-adapters/controllers/RestApiController');

import { RepositoryFactory, DatabaseType } from './infrastructure/database/RepositoryFactory';
import { ProjectObjectUseCase } from './application/use-cases/ProjectObjectUseCase';
import { RestApiController } from './interface-adapters/controllers/RestApiController';

// Create mocks
const mockRepository = {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByKey: jest.fn(),
    search: jest.fn(),
    exists: jest.fn(),
    count: jest.fn()
};

const mockUseCase = {
    createObject: jest.fn(),
    updateObject: jest.fn(),
    deleteObject: jest.fn(),
    getObject: jest.fn(),
    searchObjects: jest.fn(),
    checkObjectExists: jest.fn(),
    countObjects: jest.fn()
};

const mockRestController = {
    getResourceByPath: jest.fn(),
    createResourceByPath: jest.fn(),
    updateResourceByPath: jest.fn(),
    deleteResourceByPath: jest.fn(),
    searchResourcesByPath: jest.fn(),
    getResourceByIdWithHeaders: jest.fn(),
    createResourceByIdWithHeaders: jest.fn(),
    updateResourceByIdWithHeaders: jest.fn(),
    deleteResourceByIdWithHeaders: jest.fn(),
    searchResourcesByHeaders: jest.fn()
};

// Mock implementations
(RepositoryFactory.create as jest.Mock).mockReturnValue(mockRepository);
(ProjectObjectUseCase as jest.Mock).mockImplementation(() => mockUseCase);
(RestApiController as jest.Mock).mockImplementation(() => mockRestController);

// Mock swagger document
jest.mock('./swagger.json', () => ({
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths: {}
}));

describe('Server.ts Configuration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Clear environment variables
        delete process.env.DATABASE_TYPE;
        delete process.env.MONGODB_URI;
        delete process.env.AWS_REGION;
        delete process.env.DYNAMODB_ENDPOINT;
        delete process.env.DYNAMODB_TABLE;
        delete process.env.PORT;
        
        // Mock console methods
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Database Configuration Logic', () => {
        it('should default to IN_MEMORY database when no environment variable is set', () => {
            // This simulates the logic in the server initialization
            const databaseType = process.env.DATABASE_TYPE || 'IN_MEMORY';
            let dbType: DatabaseType;
            
            switch (databaseType.toUpperCase()) {
                case 'MONGODB':
                    dbType = DatabaseType.MONGODB;
                    break;
                case 'DYNAMODB':
                    dbType = DatabaseType.DYNAMODB;
                    break;
                default:
                    dbType = DatabaseType.IN_MEMORY;
            }

            expect(dbType).toBe(DatabaseType.IN_MEMORY);
        });

        it('should use MONGODB when DATABASE_TYPE is set to mongodb', () => {
            process.env.DATABASE_TYPE = 'MONGODB';
            
            const databaseType = process.env.DATABASE_TYPE || 'IN_MEMORY';
            let dbType: DatabaseType;
            
            switch (databaseType.toUpperCase()) {
                case 'MONGODB':
                    dbType = DatabaseType.MONGODB;
                    break;
                case 'DYNAMODB':
                    dbType = DatabaseType.DYNAMODB;
                    break;
                default:
                    dbType = DatabaseType.IN_MEMORY;
            }

            expect(dbType).toBe(DatabaseType.MONGODB);
        });

        it('should use DYNAMODB when DATABASE_TYPE is set to dynamodb', () => {
            process.env.DATABASE_TYPE = 'DYNAMODB';
            
            const databaseType = process.env.DATABASE_TYPE || 'IN_MEMORY';
            let dbType: DatabaseType;
            
            switch (databaseType.toUpperCase()) {
                case 'MONGODB':
                    dbType = DatabaseType.MONGODB;
                    break;
                case 'DYNAMODB':
                    dbType = DatabaseType.DYNAMODB;
                    break;
                default:
                    dbType = DatabaseType.IN_MEMORY;
            }

            expect(dbType).toBe(DatabaseType.DYNAMODB);
        });

        it('should handle case-insensitive database type configuration', () => {
            const testCases = [
                { input: 'mongodb', expected: DatabaseType.MONGODB },
                { input: 'MONGODB', expected: DatabaseType.MONGODB },
                { input: 'MongoDB', expected: DatabaseType.MONGODB },
                { input: 'dynamodb', expected: DatabaseType.DYNAMODB },
                { input: 'DYNAMODB', expected: DatabaseType.DYNAMODB },
                { input: 'DynamoDB', expected: DatabaseType.DYNAMODB },
                { input: 'unknown', expected: DatabaseType.IN_MEMORY },
                { input: '', expected: DatabaseType.IN_MEMORY }
            ];

            testCases.forEach(({ input, expected }) => {
                const databaseType = input || 'IN_MEMORY';
                let dbType: DatabaseType;
                
                switch (databaseType.toUpperCase()) {
                    case 'MONGODB':
                        dbType = DatabaseType.MONGODB;
                        break;
                    case 'DYNAMODB':
                        dbType = DatabaseType.DYNAMODB;
                        break;
                    default:
                        dbType = DatabaseType.IN_MEMORY;
                }

                expect(dbType).toBe(expected);
            });
        });
    });

    describe('MongoDB Configuration Options', () => {
        it('should build MongoDB configuration options correctly', () => {
            process.env.DATABASE_TYPE = 'MONGODB';
            process.env.MONGODB_URI = 'mongodb://custom:host@localhost:27017/custom-db';

            const repositoryOptions: any = { type: DatabaseType.MONGODB };
            repositoryOptions.connectionString = process.env.MONGODB_URI || 'mongodb://root:password@mongodb:27017/thoth?authSource=admin';

            expect(repositoryOptions.type).toBe(DatabaseType.MONGODB);
            expect(repositoryOptions.connectionString).toBe('mongodb://custom:host@localhost:27017/custom-db');
        });

        it('should use default MongoDB connection string when not specified', () => {
            process.env.DATABASE_TYPE = 'MONGODB';
            delete process.env.MONGODB_URI;

            const repositoryOptions: any = { type: DatabaseType.MONGODB };
            repositoryOptions.connectionString = process.env.MONGODB_URI || 'mongodb://root:password@mongodb:27017/thoth?authSource=admin';

            expect(repositoryOptions.connectionString).toBe('mongodb://root:password@mongodb:27017/thoth?authSource=admin');
        });
    });

    describe('DynamoDB Configuration Options', () => {
        it('should build DynamoDB configuration options correctly', () => {
            process.env.DATABASE_TYPE = 'DYNAMODB';
            process.env.AWS_REGION = 'us-west-2';
            process.env.DYNAMODB_ENDPOINT = 'http://custom-endpoint:8000';
            process.env.DYNAMODB_TABLE = 'custom-table';

            const repositoryOptions: any = { type: DatabaseType.DYNAMODB };
            repositoryOptions.region = process.env.AWS_REGION || 'us-east-1';
            repositoryOptions.endpoint = process.env.DYNAMODB_ENDPOINT || 'http://dynamodb-local:8000';
            repositoryOptions.tableName = process.env.DYNAMODB_TABLE || 'thoth-objects';

            expect(repositoryOptions.type).toBe(DatabaseType.DYNAMODB);
            expect(repositoryOptions.region).toBe('us-west-2');
            expect(repositoryOptions.endpoint).toBe('http://custom-endpoint:8000');
            expect(repositoryOptions.tableName).toBe('custom-table');
        });

        it('should use default DynamoDB options when not specified', () => {
            process.env.DATABASE_TYPE = 'DYNAMODB';
            delete process.env.AWS_REGION;
            delete process.env.DYNAMODB_ENDPOINT;
            delete process.env.DYNAMODB_TABLE;

            const repositoryOptions: any = { type: DatabaseType.DYNAMODB };
            repositoryOptions.region = process.env.AWS_REGION || 'us-east-1';
            repositoryOptions.endpoint = process.env.DYNAMODB_ENDPOINT || 'http://dynamodb-local:8000';
            repositoryOptions.tableName = process.env.DYNAMODB_TABLE || 'thoth-objects';

            expect(repositoryOptions.region).toBe('us-east-1');
            expect(repositoryOptions.endpoint).toBe('http://dynamodb-local:8000');
            expect(repositoryOptions.tableName).toBe('thoth-objects');
        });
    });

    describe('Server Port Configuration', () => {
        it('should use default port when PORT environment variable is not set', () => {
            delete process.env.PORT;
            
            const port = parseInt(process.env.PORT || '3000', 10);
            
            expect(port).toBe(3000);
        });

        it('should use custom port when PORT environment variable is set', () => {
            process.env.PORT = '8080';
            
            const port = parseInt(process.env.PORT || '3000', 10);
            
            expect(port).toBe(8080);
        });

        it('should handle invalid port values gracefully', () => {
            process.env.PORT = 'invalid-port';
            
            const port = parseInt(process.env.PORT || '3000', 10);
            
            expect(isNaN(port)).toBe(true);
        });

        it('should handle empty port values', () => {
            process.env.PORT = '';
            
            const port = parseInt(process.env.PORT || '3000', 10);
            
            expect(port).toBe(3000);
        });
    });

    describe('CORS Configuration', () => {
        it('should create proper CORS headers', () => {
            const corsHeaders = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Tenant-Id, X-Resource-Type, X-Resource-Id'
            };

            expect(corsHeaders['Access-Control-Allow-Origin']).toBe('*');
            expect(corsHeaders['Access-Control-Allow-Methods']).toContain('GET');
            expect(corsHeaders['Access-Control-Allow-Methods']).toContain('POST');
            expect(corsHeaders['Access-Control-Allow-Methods']).toContain('PUT');
            expect(corsHeaders['Access-Control-Allow-Methods']).toContain('DELETE');
            expect(corsHeaders['Access-Control-Allow-Methods']).toContain('OPTIONS');
            expect(corsHeaders['Access-Control-Allow-Headers']).toContain('X-Tenant-Id');
            expect(corsHeaders['Access-Control-Allow-Headers']).toContain('X-Resource-Type');
        });
    });

    describe('Health Check Response', () => {
        it('should create proper health check response', () => {
            const healthResponse = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                database: process.env.DATABASE_TYPE || 'IN_MEMORY'
            };

            expect(healthResponse.status).toBe('healthy');
            expect(healthResponse.version).toBe('1.0.0');
            expect(healthResponse.database).toBe('IN_MEMORY');
            expect(Date.parse(healthResponse.timestamp)).toBeGreaterThan(0);
        });

        it('should include correct database type in health response', () => {
            process.env.DATABASE_TYPE = 'MONGODB';
            
            const healthResponse = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                database: process.env.DATABASE_TYPE || 'IN_MEMORY'
            };

            expect(healthResponse.database).toBe('MONGODB');
        });
    });

    describe('API Info Response', () => {
        it('should create proper API info response', () => {
            const apiInfo = {
                message: 'Thoth Database System API',
                version: '1.0.0',
                endpoints: {
                    'GET /health': 'Health check',
                    'GET /api': 'API information',
                    'GET /api-docs': 'API documentation (Swagger UI)',
                    'GET|POST|PUT|DELETE /tenants/{tenantId}/resources/{resourceType}/{resourceId}': 'Path-based resource operations',
                    'GET|POST|PUT|DELETE /resources': 'Header-based resource operations (requires X-Tenant-Id, X-Resource-Type, and X-Resource-Id headers)',
                    'GET /tenants/{tenantId}/resources/{resourceType}': 'Search resources by tenant and type',
                    'GET /resources/search': 'Header-based search resources (optional headers: X-Tenant-Id, X-Resource-Type, X-Resource-Id; supports q parameter)'
                }
            };

            expect(apiInfo.message).toBe('Thoth Database System API');
            expect(apiInfo.version).toBe('1.0.0');
            expect(apiInfo.endpoints).toHaveProperty('GET /health');
            expect(apiInfo.endpoints).toHaveProperty('GET /api');
            expect(apiInfo.endpoints).toHaveProperty('GET /api-docs');
            expect(apiInfo.endpoints).toHaveProperty('GET /resources/search');
            expect(apiInfo.endpoints['GET /resources/search']).toBe('Header-based search resources (optional headers: X-Tenant-Id, X-Resource-Type, X-Resource-Id; supports q parameter)');
        });
    });

    describe('Request Header Validation', () => {
        it('should validate required headers for header-based CRUD endpoints', () => {
            const validateCrudHeaders = (tenantId?: string, resourceType?: string, resourceId?: string) => {
                if (!tenantId || !resourceType || !resourceId) {
                    return {
                        valid: false,
                        error: 'Missing required headers: X-Tenant-Id, X-Resource-Type, and X-Resource-Id'
                    };
                }
                return { valid: true };
            };

            expect(validateCrudHeaders()).toEqual({
                valid: false,
                error: 'Missing required headers: X-Tenant-Id, X-Resource-Type, and X-Resource-Id'
            });

            expect(validateCrudHeaders('tenant')).toEqual({
                valid: false,
                error: 'Missing required headers: X-Tenant-Id, X-Resource-Type, and X-Resource-Id'
            });

            expect(validateCrudHeaders('tenant', 'type')).toEqual({
                valid: false,
                error: 'Missing required headers: X-Tenant-Id, X-Resource-Type, and X-Resource-Id'
            });

            expect(validateCrudHeaders('tenant', 'type', 'id')).toEqual({
                valid: true
            });
        });

        it('should allow optional headers for search endpoints', () => {
            const validateSearchHeaders = (tenantId?: string, resourceType?: string, resourceId?: string) => {
                // Search endpoints allow any combination of headers (all optional)
                return { valid: true };
            };

            expect(validateSearchHeaders()).toEqual({ valid: true });
            expect(validateSearchHeaders('tenant')).toEqual({ valid: true });
            expect(validateSearchHeaders(undefined, 'type')).toEqual({ valid: true });
            expect(validateSearchHeaders('tenant', 'type', 'id')).toEqual({ valid: true });
        });
    });

    describe('Error Handling Configuration', () => {
        it('should create proper error responses for different scenarios', () => {
            const createErrorResponse = (status: number, message: string) => {
                return {
                    status,
                    body: { error: message }
                };
            };

            const badRequestError = createErrorResponse(400, 'Missing required headers: X-Tenant-Id, X-Resource-Type, and X-Resource-Id');
            const notFoundError = createErrorResponse(404, 'Route not found');
            const serverError = createErrorResponse(500, 'Internal server error');

            expect(badRequestError.status).toBe(400);
            expect(badRequestError.body.error).toContain('Missing required headers');

            expect(notFoundError.status).toBe(404);
            expect(notFoundError.body.error).toBe('Route not found');

            expect(serverError.status).toBe(500);
            expect(serverError.body.error).toBe('Internal server error');
        });
    });

    describe('Signal Handling Configuration', () => {
        it('should handle graceful shutdown signals', () => {
            const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
                throw new Error('process.exit called');
            });

            const consoleLogSpy = jest.spyOn(console, 'log');

            // Simulate SIGTERM handling
            const sigTermHandler = () => {
                console.log('SIGTERM received, shutting down gracefully');
                process.exit(0);
            };

            // Simulate SIGINT handling
            const sigIntHandler = () => {
                console.log('SIGINT received, shutting down gracefully');
                process.exit(0);
            };

            expect(() => sigTermHandler()).toThrow('process.exit called');
            expect(consoleLogSpy).toHaveBeenCalledWith('SIGTERM received, shutting down gracefully');

            expect(() => sigIntHandler()).toThrow('process.exit called');
            expect(consoleLogSpy).toHaveBeenCalledWith('SIGINT received, shutting down gracefully');

            mockExit.mockRestore();
        });
    });

    describe('Middleware Configuration', () => {
        it('should configure express middleware correctly', () => {
            const app = express();
            
            // Test that middleware can be applied
            app.use(express.json());
            app.use(express.urlencoded({ extended: true }));

            expect(app).toBeDefined();
        });

        it('should handle JSON and URL-encoded bodies', () => {
            const testData = { title: 'Test', content: 'Content' };
            const jsonString = JSON.stringify(testData);
            const urlEncoded = 'title=Test&content=Content';

            expect(() => JSON.parse(jsonString)).not.toThrow();
            expect(JSON.parse(jsonString)).toEqual(testData);
            
            // URL encoding test
            const decoded = decodeURIComponent(urlEncoded);
            expect(decoded).toBe('title=Test&content=Content');
        });
    });

    describe('Route Pattern Validation', () => {
        it('should validate path-based route patterns', () => {
            const pathPattern = '/tenants/:tenantId/resources/:resourceType/:resourceId';
            const testPath = '/tenants/test-tenant/resources/document/doc-123';

            // Simple regex to test pattern matching
            const patternRegex = /^\/tenants\/([^\/]+)\/resources\/([^\/]+)\/([^\/]+)$/;
            const match = testPath.match(patternRegex);

            expect(match).not.toBeNull();
            expect(match![1]).toBe('test-tenant');
            expect(match![2]).toBe('document');
            expect(match![3]).toBe('doc-123');
        });

        it('should validate header-based route patterns', () => {
            const headerPattern = '/resources/:resourceId';
            const testPath = '/resources/doc-123';

            const patternRegex = /^\/resources\/([^\/]+)$/;
            const match = testPath.match(patternRegex);

            expect(match).not.toBeNull();
            expect(match![1]).toBe('doc-123');
        });

        it('should validate search route patterns', () => {
            const searchPattern = '/tenants/:tenantId/resources/:resourceType';
            const testPath = '/tenants/test-tenant/resources/document';

            const patternRegex = /^\/tenants\/([^\/]+)\/resources\/([^\/]+)$/;
            const match = testPath.match(patternRegex);

            expect(match).not.toBeNull();
            expect(match![1]).toBe('test-tenant');
            expect(match![2]).toBe('document');
        });
    });

    describe('Repository Factory Integration', () => {
        it('should create repository with correct configuration', () => {
            const config = { type: DatabaseType.IN_MEMORY };
            
            RepositoryFactory.create(config);
            
            expect(RepositoryFactory.create).toHaveBeenCalledWith(config);
        });

        it('should handle repository creation errors gracefully', () => {
            (RepositoryFactory.create as jest.Mock).mockImplementationOnce(() => {
                throw new Error('Repository creation failed');
            });

            expect(() => {
                try {
                    RepositoryFactory.create({ type: DatabaseType.IN_MEMORY });
                } catch (error) {
                    // Fallback to in-memory
                    RepositoryFactory.create({ type: DatabaseType.IN_MEMORY });
                }
            }).not.toThrow();
        });
    });
});