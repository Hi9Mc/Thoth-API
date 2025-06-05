import { ProjectObject, ProjectObjectKey } from '../../domain/entities/ProjectObject';
import { SearchOption, PaginationOption } from '../../domain/entities/SearchCriteria';
import { ProjectObjectRepository } from '../../domain/repositories/ProjectObjectRepository';
import { CircuitBreaker, CircuitBreakerConfig } from '../circuit-breaker/CircuitBreaker';

/**
 * Circuit Breaker wrapper for ProjectObjectRepository
 * Implements the Circuit Breaker pattern to provide fault tolerance and resilience
 */
export class CircuitBreakerRepositoryWrapper<T extends ProjectObject = ProjectObject> implements ProjectObjectRepository<T> {
    private circuitBreaker: CircuitBreaker;

    constructor(
        private repository: ProjectObjectRepository<T>,
        config: CircuitBreakerConfig = {
            failureThreshold: 5,
            resetTimeout: 60000, // 1 minute
            monitoringPeriod: 10000 // 10 seconds
        }
    ) {
        this.circuitBreaker = new CircuitBreaker(config);
    }

    async create(obj: T): Promise<T> {
        return this.circuitBreaker.execute(() => this.repository.create(obj));
    }

    async update(obj: T): Promise<T> {
        return this.circuitBreaker.execute(() => this.repository.update(obj));
    }

    async delete(key: ProjectObjectKey): Promise<boolean> {
        return this.circuitBreaker.execute(() => this.repository.delete(key));
    }

    async findByKey(key: ProjectObjectKey): Promise<T | null> {
        return this.circuitBreaker.execute(() => this.repository.findByKey(key));
    }

    async search(condition: SearchOption<T>, pagination: PaginationOption<T>): Promise<{ results: T[], total: number }> {
        return this.circuitBreaker.execute(() => this.repository.search(condition, pagination));
    }

    async exists(condition: SearchOption<T>): Promise<boolean> {
        return this.circuitBreaker.execute(() => this.repository.exists(condition));
    }

    async count(condition: SearchOption<T>): Promise<number> {
        return this.circuitBreaker.execute(() => this.repository.count(condition));
    }

    getCircuitBreakerMetrics() {
        return this.circuitBreaker.getMetrics();
    }

    resetCircuitBreaker(): void {
        this.circuitBreaker.reset();
    }
}