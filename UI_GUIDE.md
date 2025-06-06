# Thoth UI Usage Guide

This document explains how to use the Thoth Data Management UI for managing project objects with dynamic fields.

## Starting the Server

1. Navigate to the source directory:
   ```bash
   cd source
   npm install
   npm run build
   npm start
   ```

2. Open your browser and go to: `http://localhost:3000`

## UI Features

### 1. Dynamic Field Management

The UI allows you to add and remove custom fields dynamically:

- **Add Fields**: Use the "Add New Field" section to add custom fields
- **Field Types**: Choose from string, number, boolean, date, JSON object, or array
- **Input Adaptation**: Input controls automatically change based on the selected data type
- **Remove Fields**: Each custom field has a "Remove" button

### 2. Data Type Support

Each field type provides appropriate input controls:

- **String**: Text input
- **Number**: Number input with validation
- **Boolean**: Checkbox input
- **Date**: Date picker
- **JSON Object**: Textarea with JSON validation
- **Array**: Textarea with JSON array validation

### 3. Object Management

- **Create**: Fill the form and click "Save Object"
- **Load**: Enter object identifiers and click "Load Object"
- **Update**: Modify an existing object and save
- **Delete**: Click "Delete Object" (with confirmation)
- **Clear**: Reset the form with "Clear Form"

### 4. Search and Browse

- Search objects by tenant ID and/or resource type
- Click on search results to load them into the form
- Browse all objects within a tenant

## Example Usage

1. **Create a Document Object**:
   - Tenant ID: `my-company`
   - Resource Type: `document`
   - Resource ID: `user-manual`
   - Version: `1`
   - Add custom fields:
     - `title` (string): "User Manual"
     - `isPublished` (boolean): true
     - `wordCount` (number): 1500
     - `tags` (array): `["manual", "guide", "help"]`

2. **Create a User Object**:
   - Tenant ID: `my-company`
   - Resource Type: `user`
   - Resource ID: `jane-smith`
   - Version: `1`
   - Add custom fields:
     - `name` (string): "Jane Smith"
     - `email` (string): "jane.smith@company.com"
     - `isActive` (boolean): true
     - `joinDate` (date): 2024-01-15
     - `preferences` (JSON): `{"theme": "light", "notifications": true}`

## API Integration

The UI uses the existing REST API endpoints:

- `GET /tenants/{tenantId}/resources/{resourceType}/{resourceId}` - Load object
- `POST /tenants/{tenantId}/resources/{resourceType}/{resourceId}` - Create object  
- `PUT /tenants/{tenantId}/resources/{resourceType}/{resourceId}` - Update object
- `DELETE /tenants/{tenantId}/resources/{resourceType}/{resourceId}` - Delete object
- `GET /tenants/{tenantId}/resources/{resourceType}` - Search objects

## Technical Details

- Frontend: Vanilla HTML, CSS, JavaScript (no framework dependencies)
- Responsive design that works on desktop and mobile
- Real-time field validation and error handling
- JSON syntax validation for complex field types
- Status messages for user feedback