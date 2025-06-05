import { ProjectObject, ProjectObjectKey } from '../entities/ProjectObject';
import { SearchOption, PaginationOption } from '../entities/SearchCriteria';

export interface ProjectObjectRepository<T extends ProjectObject = ProjectObject> {
    create(obj: T): Promise<T>;
    update(obj: T): Promise<T>;
    delete(key: ProjectObjectKey): Promise<boolean>;
    findByKey(key: ProjectObjectKey): Promise<T | null>;
    search(condition: SearchOption<T>, pagination: PaginationOption<T>): Promise<{ results: T[], total: number }>;
    exists(condition: SearchOption<T>): Promise<boolean>;
    count(condition: SearchOption<T>): Promise<number>;
}