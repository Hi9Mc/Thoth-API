export interface ProjectObject {
    projectId: string;
    contentType: string;
    contentId: string;
    version: number;
    [key: string]: any;
}

export interface ProjectObjectKey {
    projectId: string;
    contentType: string;
    contentId: string;
    version: number;
}