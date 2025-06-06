"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoDbDatabaseService = void 0;
const IDatabaseService_1 = require("./IDatabaseService");
const mongodb_1 = require("mongodb");
class MongoDbDatabaseService {
    constructor(connectionString = 'mongodb://localhost:27017', databaseName = 'thoth', collectionName = 'objects') {
        this.connectionString = connectionString;
        this.databaseName = databaseName;
        this.collectionName = collectionName;
        this.client = new mongodb_1.MongoClient(connectionString);
        this.db = this.client.db(databaseName);
        this.collection = this.db.collection(collectionName);
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
            this.instances.set(key, new MongoDbDatabaseService('mongodb://localhost:27017', 'thoth', `objects_${tenantId}`));
        }
        return this.instances.get(key);
    }
    generateKey(tenantId, resourceType, resourceId, version) {
        return `${tenantId}#${resourceType}#${resourceId}#${version}`;
    }
    async create(obj) {
        const _id = this.generateKey(obj.tenantId, obj.resourceType, obj.resourceId, obj.version);
        const document = {
            ...obj,
            _id
        };
        await this.collection.insertOne(document);
        return obj;
    }
    async update(obj) {
        const _id = this.generateKey(obj.tenantId, obj.resourceType, obj.resourceId, obj.version);
        // First check if the object exists
        const existing = await this.getByKey(obj.tenantId, obj.resourceType, obj.resourceId, obj.version);
        if (!existing) {
            throw new Error('Object not found');
        }
        const document = {
            ...obj,
            _id
        };
        await this.collection.replaceOne({ _id }, document);
        return obj;
    }
    async delete(tenantId, resourceType, resourceId, version) {
        const _id = this.generateKey(tenantId, resourceType, resourceId, version);
        const result = await this.collection.deleteOne({ _id });
        return result.deletedCount > 0;
    }
    async getByKey(tenantId, resourceType, resourceId, version) {
        const _id = this.generateKey(tenantId, resourceType, resourceId, version);
        const result = await this.collection.findOne({ _id });
        if (!result) {
            return null;
        }
        // Remove MongoDB-specific _id field from the result
        const { _id: id, ...objectData } = result;
        return objectData;
    }
    async search(condition, pagination) {
        var _a, _b;
        const filter = this.buildMongoFilter(condition);
        // Get total count
        const total = await this.collection.countDocuments(filter);
        // Build query with pagination
        const page = (_a = pagination.page) !== null && _a !== void 0 ? _a : 1;
        const limit = (_b = pagination.limit) !== null && _b !== void 0 ? _b : 20;
        const skip = (page - 1) * limit;
        let query = this.collection.find(filter).skip(skip).limit(limit);
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
    async exists(condition) {
        const filter = this.buildMongoFilter(condition);
        const result = await this.collection.findOne(filter);
        return result !== null;
    }
    async count(condition) {
        const filter = this.buildMongoFilter(condition);
        return await this.collection.countDocuments(filter);
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
    async dropCollection() {
        try {
            await this.collection.drop();
        }
        catch (error) {
            // Ignore errors if collection doesn't exist
        }
    }
}
exports.MongoDbDatabaseService = MongoDbDatabaseService;
MongoDbDatabaseService.instances = new Map();
