// MongoDB initialization script for Thoth database
// This script creates the thoth database and objects collection

// Switch to thoth database
db = db.getSiblingDB('thoth');

// Create objects collection with some basic indexing
db.createCollection('objects');

// Create indexes for better query performance
db.objects.createIndex({ tenantId: 1 });
db.objects.createIndex({ resourceType: 1 });
db.objects.createIndex({ resourceId: 1 });
db.objects.createIndex({ version: 1 });
db.objects.createIndex({ tenantId: 1, resourceType: 1, resourceId: 1, version: 1 }, { unique: true });

print('Thoth database initialized successfully');