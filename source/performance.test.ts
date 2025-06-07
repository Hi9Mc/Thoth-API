/**
 * @jest-environment node
 */
import '@jest/globals';
import 'jest';
import { InMemoryDatabaseService } from './infrastructure/database/InMemoryDatabaseService';
import { ProjectObject, SearchConditionOperator, SearchLogicalOperator, SearchOption, PaginationOption, SortDirection } from './infrastructure/database/IDatabaseService';

describe('Performance and Stress Testing', () => {
    let db: InMemoryDatabaseService<ProjectObject>;

    beforeEach(() => {
        db = new InMemoryDatabaseService<ProjectObject>();
    });

    describe('Large Dataset Performance', () => {
        it('should handle creating thousands of objects efficiently', async () => {
            const objectCount = 5000;
            const objects = Array.from({ length: objectCount }, (_, i) => ({
                tenantId: `tenant-${i % 10}`, // 10 different tenants
                resourceType: `type-${i % 5}`, // 5 different types
                resourceId: `resource-${i}`,
                version: 1,
                name: `Object ${i}`,
                priority: i % 3, // 0, 1, 2
                active: i % 2 === 0, // alternating true/false
                score: Math.random() * 100,
                tags: [`tag-${i % 100}`, `category-${i % 50}`],
                metadata: {
                    createdAt: new Date(2023, 0, 1 + (i % 365)),
                    department: `dept-${i % 20}`,
                    size: i % 1000,
                    description: `This is a test object number ${i} with some longer text content to simulate real-world data.`
                }
            }));

            const startTime = Date.now();

            // Create all objects
            for (const obj of objects) {
                await db.create(obj);
            }

            const createTime = Date.now() - startTime;
            console.log(`Created ${objectCount} objects in ${createTime}ms (${(objectCount / createTime * 1000).toFixed(2)} objects/second)`);

            expect(createTime).toBeLessThan(30000); // Should complete within 30 seconds
        }, 35000); // Increase Jest timeout

        it('should handle complex searches on large datasets efficiently', async () => {
            // First, create a large dataset
            const objectCount = 2000;
            const objects = Array.from({ length: objectCount }, (_, i) => ({
                tenantId: `tenant-${i % 5}`,
                resourceType: `type-${i % 3}`,
                resourceId: `resource-${i}`,
                version: 1,
                name: `Object ${i}`,
                priority: i % 10,
                active: i % 2 === 0,
                score: Math.random() * 100,
                category: `category-${i % 20}`
            }));

            for (const obj of objects) {
                await db.create(obj);
            }

            // Test various search scenarios
            const searchScenarios = [
                {
                    name: 'Simple equality search',
                    condition: {
                        logic: SearchLogicalOperator.AND,
                        conditions: [
                            { key: 'tenantId', value: 'tenant-1', operator: SearchConditionOperator.EQUALS }
                        ]
                    }
                },
                {
                    name: 'Multi-field AND search',
                    condition: {
                        logic: SearchLogicalOperator.AND,
                        conditions: [
                            { key: 'tenantId', value: 'tenant-1', operator: SearchConditionOperator.EQUALS },
                            { key: 'active', value: true, operator: SearchConditionOperator.EQUALS },
                            { key: 'priority', value: 5, operator: SearchConditionOperator.GREATER_THAN }
                        ]
                    }
                },
                {
                    name: 'Complex OR search',
                    condition: {
                        logic: SearchLogicalOperator.OR,
                        conditions: [
                            { key: 'priority', value: 9, operator: SearchConditionOperator.EQUALS },
                            { key: 'category', value: 'category-5', operator: SearchConditionOperator.EQUALS },
                            { key: 'score', value: 90, operator: SearchConditionOperator.GREATER_THAN }
                        ]
                    }
                },
                {
                    name: 'Range search',
                    condition: {
                        logic: SearchLogicalOperator.AND,
                        conditions: [
                            { key: 'priority', value: 3, operator: SearchConditionOperator.GREATER_THAN_OR_EQUAL },
                            { key: 'priority', value: 7, operator: SearchConditionOperator.LESS_THAN_OR_EQUAL }
                        ]
                    }
                },
                {
                    name: 'IN operator search',
                    condition: {
                        logic: SearchLogicalOperator.AND,
                        conditions: [
                            { key: 'resourceType', value: ['type-0', 'type-1'], operator: SearchConditionOperator.IN }
                        ]
                    }
                }
            ];

            for (const scenario of searchScenarios) {
                const startTime = Date.now();
                const result = await db.search(scenario.condition, { page: 1, limit: 100 });
                const searchTime = Date.now() - startTime;

                console.log(`${scenario.name}: Found ${result.total} results in ${searchTime}ms`);
                expect(searchTime).toBeLessThan(1000); // Should complete within 1 second
                expect(result).toHaveProperty('results');
                expect(result).toHaveProperty('total');
                expect(Array.isArray(result.results)).toBe(true);
                expect(typeof result.total).toBe('number');
            }
        }, 30000);

        it('should handle pagination efficiently with large datasets', async () => {
            // Create dataset
            const objectCount = 3000;
            const objects = Array.from({ length: objectCount }, (_, i) => ({
                tenantId: 'test-tenant',
                resourceType: 'document',
                resourceId: `doc-${i}`,
                version: 1,
                name: `Document ${i}`,
                priority: i % 100,
                score: Math.random() * 1000
            }));

            for (const obj of objects) {
                await db.create(obj);
            }

            const pageSize = 50;
            const maxPages = 10;
            
            for (let page = 1; page <= maxPages; page++) {
                const startTime = Date.now();
                
                const result = await db.search(
                    {
                        logic: SearchLogicalOperator.AND,
                        conditions: [
                            { key: 'tenantId', value: 'test-tenant', operator: SearchConditionOperator.EQUALS }
                        ]
                    },
                    {
                        page,
                        limit: pageSize,
                        sortBy: 'priority',
                        sortDirection: SortDirection.ASC
                    }
                );

                const searchTime = Date.now() - startTime;
                
                expect(result.results).toHaveLength(pageSize);
                expect(result.total).toBe(objectCount);
                expect(searchTime).toBeLessThan(500); // Each page should load within 500ms
                
                // Verify sorting
                if (result.results.length > 1) {
                    for (let i = 1; i < result.results.length; i++) {
                        expect(result.results[i].priority).toBeGreaterThanOrEqual(result.results[i-1].priority);
                    }
                }
            }
        }, 25000);
    });

    describe('Memory Usage and Cleanup', () => {
        it('should handle rapid creation and deletion cycles', async () => {
            const cycles = 100;
            const objectsPerCycle = 50;

            for (let cycle = 0; cycle < cycles; cycle++) {
                // Create objects
                const objects = Array.from({ length: objectsPerCycle }, (_, i) => ({
                    tenantId: `cycle-${cycle}`,
                    resourceType: 'temp',
                    resourceId: `temp-${i}`,
                    version: 1,
                    data: `Cycle ${cycle} - Object ${i}`
                }));

                for (const obj of objects) {
                    await db.create(obj);
                }

                // Delete objects
                for (const obj of objects) {
                    await db.delete(obj.tenantId, obj.resourceType, obj.resourceId);
                }

                // Verify cleanup
                const remainingObjects = await db.search(
                    {
                        logic: SearchLogicalOperator.AND,
                        conditions: [
                            { key: 'tenantId', value: `cycle-${cycle}`, operator: SearchConditionOperator.EQUALS }
                        ]
                    },
                    { page: 1, limit: 1000 }
                );

                expect(remainingObjects.total).toBe(0);
            }
        }, 20000);

        it('should handle concurrent operations without data corruption', async () => {
            const concurrentOperations = 200;
            const operationPromises = [];

            // Generate unique IDs to avoid conflicts
            for (let i = 0; i < concurrentOperations; i++) {
                const obj = {
                    tenantId: `concurrent-tenant`,
                    resourceType: 'concurrent',
                    resourceId: `concurrent-${i}`,
                    version: 1,
                    operationId: i,
                    timestamp: Date.now()
                };

                operationPromises.push(db.create(obj));
            }

            // Wait for all operations to complete
            const results = await Promise.allSettled(operationPromises);

            // Count successful operations
            const successfulOps = results.filter(result => result.status === 'fulfilled').length;
            expect(successfulOps).toBe(concurrentOperations);

            // Verify all objects exist
            const finalCount = await db.search(
                {
                    logic: SearchLogicalOperator.AND,
                    conditions: [
                        { key: 'tenantId', value: 'concurrent-tenant', operator: SearchConditionOperator.EQUALS }
                    ]
                },
                { page: 1, limit: concurrentOperations * 2 }
            );

            expect(finalCount.total).toBe(concurrentOperations);
        }, 15000);
    });

    describe('Edge Case Data Handling', () => {
        it('should handle objects with extremely large text fields', async () => {
            const largeText = 'A'.repeat(100000); // 100KB of text
            const obj = {
                tenantId: 'large-data-tenant',
                resourceType: 'large-document',
                resourceId: 'large-doc-1',
                version: 1,
                content: largeText,
                metadata: {
                    size: largeText.length,
                    type: 'large-text'
                }
            };

            const startTime = Date.now();
            await db.create(obj);
            const createTime = Date.now() - startTime;

            const retrieved = await db.getByKey(obj.tenantId, obj.resourceType, obj.resourceId);
            const retrieveTime = Date.now() - startTime - createTime;

            expect(retrieved).not.toBeNull();
            expect(retrieved!.content).toBe(largeText);
            expect(createTime).toBeLessThan(1000); // Should create within 1 second
            expect(retrieveTime).toBeLessThan(500); // Should retrieve within 0.5 seconds
        });

        it('should handle objects with deeply nested structures', async () => {
            const createDeepObject = (depth: number): any => {
                if (depth <= 0) return { value: 'leaf' };
                return {
                    level: depth,
                    data: `Level ${depth} data`,
                    nested: createDeepObject(depth - 1),
                    array: Array.from({ length: 5 }, (_, i) => ({ index: i, value: `item-${i}` }))
                };
            };

            const deepObj = {
                tenantId: 'deep-structure-tenant',
                resourceType: 'nested-document',
                resourceId: 'deep-doc-1',
                version: 1,
                structure: createDeepObject(20), // 20 levels deep
                metadata: {
                    depth: 20,
                    complexity: 'high'
                }
            };

            await db.create(deepObj);
            const retrieved = await db.getByKey(deepObj.tenantId, deepObj.resourceType, deepObj.resourceId);

            expect(retrieved).not.toBeNull();
            expect(retrieved!.structure.level).toBe(20);
            expect(retrieved!.structure.nested.level).toBe(19);
        });

        it('should handle objects with various data types and edge values', async () => {
            const edgeValueObj = {
                tenantId: 'edge-values-tenant',
                resourceType: 'edge-document',
                resourceId: 'edge-doc-1',
                version: 1,
                maxNumber: Number.MAX_SAFE_INTEGER,
                minNumber: Number.MIN_SAFE_INTEGER,
                infinity: Infinity,
                negativeInfinity: -Infinity,
                notANumber: NaN,
                verySmallNumber: Number.EPSILON,
                emptyString: '',
                whitespaceString: '   \t\n   ',
                unicodeString: '🌟⭐✨🚀💫🌈🎯🔥💎🎨',
                specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
                nullValue: null,
                undefinedValue: undefined,
                emptyArray: [],
                emptyObject: {},
                booleanTrue: true,
                booleanFalse: false,
                dateValue: new Date('2023-12-31T23:59:59.999Z'),
                regexValue: /test.*pattern/gi
            };

            await db.create(edgeValueObj);
            const retrieved = await db.getByKey(edgeValueObj.tenantId, edgeValueObj.resourceType, edgeValueObj.resourceId);

            expect(retrieved).not.toBeNull();
            expect(retrieved!.maxNumber).toBe(Number.MAX_SAFE_INTEGER);
            expect(retrieved!.emptyString).toBe('');
            expect(retrieved!.unicodeString).toBe('🌟⭐✨🚀💫🌈🎯🔥💎🎨');
            expect(retrieved!.nullValue).toBeNull();
            expect(Array.isArray(retrieved!.emptyArray)).toBe(true);
            expect(retrieved!.emptyArray).toHaveLength(0);
        });
    });

    describe('Search Performance Optimization', () => {
        it('should handle complex nested search conditions efficiently', async () => {
            // Create test data
            const objectCount = 1000;
            const objects = Array.from({ length: objectCount }, (_, i) => ({
                tenantId: `tenant-${i % 10}`,
                resourceType: `type-${i % 5}`,
                resourceId: `resource-${i}`,
                version: 1,
                category: `cat-${i % 20}`,
                priority: i % 100,
                score: Math.random() * 1000,
                active: i % 3 === 0,
                tags: [`tag-${i % 50}`, `tag-${(i + 1) % 50}`]
            }));

            for (const obj of objects) {
                await db.create(obj);
            }

            // Complex nested search
            const complexCondition: SearchOption<ProjectObject> = {
                logic: SearchLogicalOperator.AND,
                conditions: [
                    {
                        logic: SearchLogicalOperator.OR,
                        conditions: [
                            { key: 'tenantId', value: 'tenant-1', operator: SearchConditionOperator.EQUALS },
                            { key: 'tenantId', value: 'tenant-2', operator: SearchConditionOperator.EQUALS },
                            { key: 'tenantId', value: 'tenant-3', operator: SearchConditionOperator.EQUALS }
                        ]
                    },
                    {
                        logic: SearchLogicalOperator.AND,
                        conditions: [
                            { key: 'priority', value: 20, operator: SearchConditionOperator.GREATER_THAN },
                            { key: 'score', value: 500, operator: SearchConditionOperator.LESS_THAN },
                            { key: 'active', value: true, operator: SearchConditionOperator.EQUALS }
                        ]
                    },
                    {
                        logic: SearchLogicalOperator.OR,
                        conditions: [
                            { key: 'category', value: ['cat-5', 'cat-10', 'cat-15'], operator: SearchConditionOperator.IN },
                            { key: 'resourceType', value: 'type-1', operator: SearchConditionOperator.EQUALS }
                        ]
                    }
                ]
            };

            const startTime = Date.now();
            const result = await db.search(complexCondition, {
                page: 1,
                limit: 100,
                sortBy: 'priority',
                sortDirection: SortDirection.DESC
            });
            const searchTime = Date.now() - startTime;

            expect(searchTime).toBeLessThan(1000); // Should complete within 1 second
            expect(result).toHaveProperty('results');
            expect(result).toHaveProperty('total');
            expect(Array.isArray(result.results)).toBe(true);

            // Verify results match the complex criteria
            result.results.forEach(item => {
                const matchesTenant = ['tenant-1', 'tenant-2', 'tenant-3'].includes(item.tenantId);
                const matchesPriority = item.priority > 20;
                const matchesScore = item.score < 500;
                const isActive = item.active === true;
                const matchesCategory = ['cat-5', 'cat-10', 'cat-15'].includes(item.category);
                const matchesType = item.resourceType === 'type-1';

                expect(matchesTenant).toBe(true);
                expect(matchesPriority && matchesScore && isActive).toBe(true);
                expect(matchesCategory || matchesType).toBe(true);
            });

            console.log(`Complex search returned ${result.total} results in ${searchTime}ms`);
        }, 15000);
    });

    describe('Stress Testing Scenarios', () => {
        it('should maintain performance under continuous load', async () => {
            const duration = 5000; // 5 seconds
            const startTime = Date.now();
            let operationCount = 0;

            while (Date.now() - startTime < duration) {
                const batch = Array.from({ length: 10 }, (_, i) => ({
                    tenantId: 'stress-test-tenant',
                    resourceType: 'stress-test',
                    resourceId: `stress-${operationCount}-${i}`,
                    version: 1,
                    timestamp: Date.now(),
                    data: `Stress test data ${operationCount}-${i}`
                }));

                // Create batch
                for (const obj of batch) {
                    await db.create(obj);
                }

                // Search
                await db.search(
                    {
                        logic: SearchLogicalOperator.AND,
                        conditions: [
                            { key: 'tenantId', value: 'stress-test-tenant', operator: SearchConditionOperator.EQUALS }
                        ]
                    },
                    { page: 1, limit: 50 }
                );

                operationCount++;
            }

            const actualDuration = Date.now() - startTime;
            const operationsPerSecond = operationCount / (actualDuration / 1000);

            console.log(`Performed ${operationCount} operation cycles in ${actualDuration}ms (${operationsPerSecond.toFixed(2)} ops/sec)`);
            expect(operationsPerSecond).toBeGreaterThan(1); // Should maintain at least 1 operation per second
        }, 10000);
    });
});