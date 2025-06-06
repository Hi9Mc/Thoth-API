"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreakerRepositoryWrapper = void 0;
const CircuitBreaker_1 = require("../circuit-breaker/CircuitBreaker");
/**
 * Circuit Breaker wrapper for ProjectObjectRepository
 * Implements the Circuit Breaker pattern to provide fault tolerance and resilience
 */
class CircuitBreakerRepositoryWrapper {
    constructor(repository, config = {
        failureThreshold: 5,
        resetTimeout: 60000, // 1 minute
        monitoringPeriod: 10000 // 10 seconds
    }) {
        this.repository = repository;
        this.circuitBreaker = new CircuitBreaker_1.CircuitBreaker(config);
    }
    async create(obj) {
        return this.circuitBreaker.execute(() => this.repository.create(obj));
    }
    async update(obj) {
        return this.circuitBreaker.execute(() => this.repository.update(obj));
    }
    async delete(key) {
        return this.circuitBreaker.execute(() => this.repository.delete(key));
    }
    async findByKey(key) {
        return this.circuitBreaker.execute(() => this.repository.findByKey(key));
    }
    async search(condition, pagination) {
        return this.circuitBreaker.execute(() => this.repository.search(condition, pagination));
    }
    async exists(condition) {
        return this.circuitBreaker.execute(() => this.repository.exists(condition));
    }
    async count(condition) {
        return this.circuitBreaker.execute(() => this.repository.count(condition));
    }
    getCircuitBreakerMetrics() {
        return this.circuitBreaker.getMetrics();
    }
    resetCircuitBreaker() {
        this.circuitBreaker.reset();
    }
}
exports.CircuitBreakerRepositoryWrapper = CircuitBreakerRepositoryWrapper;
