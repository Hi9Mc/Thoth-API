"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoDbDatabaseService = void 0;
const IDatabaseService_1 = require("./IDatabaseService");
const mongodb_1 = require("mongodb");
class MongoDbDatabaseService {
    constructor(connectionString = 'mongodb://localhost:27017', databaseName = 'thoth') {
        this.connectionString = connectionString;
        this.databaseName = databaseName;
        this.client = new mongodb_1.MongoClient(connectionString);
        this.db = this.client.db(databaseName);
    }
    static getInstance() {
        const key = 'default';
        if (!this.instances.has(key)) {
            this.instances.set(key, new MongoDbDatabaseService());
        }
        return this.instances.get(key);
    }
    static getInstanceByTenantId(tenantId) {
        const key = `tenant_${tenantId}`;
        if (!this.instances.has(key)) {
            this.instances.set(key, new MongoDbDatabaseService('mongodb://localhost:27017', tenantId));
        }
        return this.instances.get(key);
    }
    generateKey(tenantId, resourceType, resourceId, version) {
        return `${tenantId}#${resourceType}#${resourceId}#${version}`;
    }
    getCollection(resourceType) {
        return this.db.collection(resourceType);
    }
    async create(obj) {
        const _id = this.generateKey(obj.tenantId, obj.resourceType, obj.resourceId, obj.version);
        const collection = this.getCollection(obj.resourceType);
        const document = {
            ...obj,
            _id
        };
        await collection.insertOne(document);
        return obj;
    }
    async update(obj) {
        const _id = this.generateKey(obj.tenantId, obj.resourceType, obj.resourceId, obj.version);
        const collection = this.getCollection(obj.resourceType);
        // First check if the object exists
        const existing = await this.getByKey(obj.tenantId, obj.resourceType, obj.resourceId, obj.version);
        if (!existing) {
            throw new Error('Object not found');
        }
        const document = {
            ...obj,
            _id
        };
        await collection.replaceOne({ _id }, document);
        return obj;
    }
    async delete(tenantId, resourceType, resourceId, version) {
        const _id = this.generateKey(tenantId, resourceType, resourceId, version);
        const collection = this.getCollection(resourceType);
        const result = await collection.deleteOne({ _id });
        return result.deletedCount > 0;
    }
    async getByKey(tenantId, resourceType, resourceId, version) {
        const _id = this.generateKey(tenantId, resourceType, resourceId, version);
        const collection = this.getCollection(resourceType);
        const result = await collection.findOne({ _id });
        if (!result) {
            return null;
        }
        // Remove MongoDB-specific _id field from the result
        const { _id: id, ...objectData } = result;
        return objectData;
    }
    async search(condition, pagination) {
        const filter = this.buildMongoFilter(condition);
        // Check if resourceType is specified in the search conditions
        const resourceType = this.extractResourceTypeFromCondition(condition);
        if (resourceType) {
            // Search in specific collection
            return this.searchInCollection(resourceType, filter, pagination);
        }
        else {
            // Search across all collections in the database
            return this.searchAcrossCollections(filter, pagination);
        }
    }
    extractResourceTypeFromCondition(condition) {
        for (const cond of condition.conditions) {
            if ('key' in cond && cond.key === 'resourceType' && cond.operator === IDatabaseService_1.SearchConditionOperator.EQUALS) {
                return cond.value;
            }
            else if ('conditions' in cond) {
                const resourceType = this.extractResourceTypeFromCondition(cond);
                if (resourceType)
                    return resourceType;
            }
        }
        return null;
    }
    async searchInCollection(resourceType, filter, pagination) {
        var _a, _b;
        const collection = this.getCollection(resourceType);
        // Get total count
        const total = await collection.countDocuments(filter);
        // Build query with pagination
        const page = (_a = pagination.page) !== null && _a !== void 0 ? _a : 1;
        const limit = (_b = pagination.limit) !== null && _b !== void 0 ? _b : 20;
        const skip = (page - 1) * limit;
        let query = collection.find(filter).skip(skip).limit(limit);
        // Apply sorting if specified
        if (pagination.sortBy) {
            const sortDirection = pagination.sortDirection === 'DESC' ? -1 : 1;
            query = query.sort({ [pagination.sortBy]: sortDirection });
        }
        const documents = await query.toArray();
        // Remove MongoDB-specific _id field from results
        const results = documents.map(doc => {
            const { _id, ...objectData } = doc;
            return objectData;
        });
        return { results, total };
    }
    async searchAcrossCollections(filter, pagination) {
        var _a, _b;
        // Get all collections in the database
        const collections = await this.db.listCollections().toArray();
        const allResults = [];
        let totalCount = 0;
        // Search in each collection
        for (const collectionInfo of collections) {
            const collection = this.db.collection(collectionInfo.name);
            // Get count from this collection
            const count = await collection.countDocuments(filter);
            totalCount += count;
            // Get documents from this collection
            const documents = await collection.find(filter).toArray();
            const cleanedDocuments = documents.map(doc => {
                const { _id, ...objectData } = doc;
                return objectData;
            });
            allResults.push(...cleanedDocuments);
        }
        // Apply sorting if specified
        if (pagination.sortBy) {
            allResults.sort((a, b) => {
                const aVal = a[pagination.sortBy];
                const bVal = b[pagination.sortBy];
                if (aVal < bVal)
                    return pagination.sortDirection === 'DESC' ? 1 : -1;
                if (aVal > bVal)
                    return pagination.sortDirection === 'DESC' ? -1 : 1;
                return 0;
            });
        }
        // Apply pagination
        const page = (_a = pagination.page) !== null && _a !== void 0 ? _a : 1;
        const limit = (_b = pagination.limit) !== null && _b !== void 0 ? _b : 20;
        const start = (page - 1) * limit;
        const results = allResults.slice(start, start + limit);
        return { results, total: totalCount };
    }
    async exists(condition) {
        const filter = this.buildMongoFilter(condition);
        const resourceType = this.extractResourceTypeFromCondition(condition);
        if (resourceType) {
            const collection = this.getCollection(resourceType);
            const result = await collection.findOne(filter);
            return result !== null;
        }
        else {
            // Check across all collections
            const collections = await this.db.listCollections().toArray();
            for (const collectionInfo of collections) {
                const collection = this.db.collection(collectionInfo.name);
                const result = await collection.findOne(filter);
                if (result)
                    return true;
            }
            return false;
        }
    }
    async count(condition) {
        const filter = this.buildMongoFilter(condition);
        const resourceType = this.extractResourceTypeFromCondition(condition);
        if (resourceType) {
            const collection = this.getCollection(resourceType);
            return await collection.countDocuments(filter);
        }
        else {
            // Count across all collections
            const collections = await this.db.listCollections().toArray();
            let totalCount = 0;
            for (const collectionInfo of collections) {
                const collection = this.db.collection(collectionInfo.name);
                const count = await collection.countDocuments(filter);
                totalCount += count;
            }
            return totalCount;
        }
    }
    buildMongoFilter(condition) {
        if (!condition.conditions.length) {
            return {};
        }
        const filters = condition.conditions.map(cond => {
            if ('key' in cond) {
                return this.buildConditionFilter(cond);
            }
            else {
                return this.buildMongoFilter(cond);
            }
        });
        if (condition.logic === IDatabaseService_1.SearchLogicalOperator.AND) {
            return { $and: filters };
        }
        else {
            return { $or: filters };
        }
    }
    buildConditionFilter(param) {
        const key = param.key;
        const value = param.value;
        switch (param.operator) {
            case IDatabaseService_1.SearchConditionOperator.EQUALS:
                return { [key]: value };
            case IDatabaseService_1.SearchConditionOperator.NOT_EQUALS:
                return { [key]: { $ne: value } };
            case IDatabaseService_1.SearchConditionOperator.GREATER_THAN:
                return { [key]: { $gt: value } };
            case IDatabaseService_1.SearchConditionOperator.GREATER_THAN_OR_EQUAL:
                return { [key]: { $gte: value } };
            case IDatabaseService_1.SearchConditionOperator.LESS_THAN:
                return { [key]: { $lt: value } };
            case IDatabaseService_1.SearchConditionOperator.LESS_THAN_OR_EQUAL:
                return { [key]: { $lte: value } };
            case IDatabaseService_1.SearchConditionOperator.LIKE:
                return { [key]: { $regex: value, $options: 'i' } };
            case IDatabaseService_1.SearchConditionOperator.NOT_LIKE:
                return { [key]: { $not: { $regex: value, $options: 'i' } } };
            case IDatabaseService_1.SearchConditionOperator.IN:
                return { [key]: { $in: value } };
            case IDatabaseService_1.SearchConditionOperator.NOT_IN:
                return { [key]: { $nin: value } };
            case IDatabaseService_1.SearchConditionOperator.BETWEEN:
                if (Array.isArray(value) && value.length >= 2) {
                    return { [key]: { $gte: value[0], $lte: value[1] } };
                }
                return {};
            default:
                return {};
        }
    }
    // Utility method to connect to MongoDB (for testing purposes)
    async connect() {
        await this.client.connect();
    }
    // Utility method to disconnect from MongoDB (for testing cleanup)
    async disconnect() {
        await this.client.close();
    }
    // Utility method to drop collection (for testing cleanup)
    async dropCollection(resourceType) {
        try {
            if (resourceType) {
                const collection = this.getCollection(resourceType);
                await collection.drop();
            }
            else {
                // Drop all collections in the database
                const collections = await this.db.listCollections().toArray();
                for (const collectionInfo of collections) {
                    await this.db.collection(collectionInfo.name).drop();
                }
            }
        }
        catch (error) {
            // Ignore errors if collection doesn't exist
        }
    }
    // Utility method to drop entire database (for testing cleanup)
    async dropDatabase() {
        try {
            await this.db.dropDatabase();
        }
        catch (error) {
            // Ignore errors if database doesn't exist
        }
    }
}
exports.MongoDbDatabaseService = MongoDbDatabaseService;
MongoDbDatabaseService.instances = new Map();
