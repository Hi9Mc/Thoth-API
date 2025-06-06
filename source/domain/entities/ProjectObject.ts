export interface ProjectObject {
    tenantId: string;
    resourceType: string;
    resourceId: string;
    version: number;
    [key: string]: any;
}

export interface ProjectObjectKey {
    tenantId: string;
    resourceType: string;
    resourceId: string;
}