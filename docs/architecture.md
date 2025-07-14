# Monorepo Architecture: TanStack Start + Cloudflare Workers Microservices

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack & Design Decisions](#tech-stack--design-decisions)
- [Monorepo Structure](#monorepo-structure)
- [Development Workflow](#development-workflow)
- [Service Binding Communication](#service-binding-communication)
- [Deployment Strategy](#deployment-strategy)
- [Scaling Patterns](#scaling-patterns)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Architecture Overview

### Philosophy

This architecture implements a **hybrid microservices approach** that combines the development velocity of a unified web application with the scalability and separation of concerns provided by microservices. The key insight is knowing when to keep functionality unified versus when to separate it.

### Core Principles

1. **Unified Web Experience**: Main web application uses TanStack Start for rapid development, SSR, and cohesive user experience
2. **Specialized Workers**: Compute-intensive, domain-specific, or independently scalable functionality lives in separate Cloudflare Workers
3. **Zero-Latency Communication**: Service bindings provide direct, type-safe communication between workers without HTTP overhead
4. **Team Autonomy**: Different teams can own and deploy different workers independently
5. **Cost Efficiency**: Service bindings incur no additional costs, making microservices economically viable

### When to Use This Pattern

**✅ Ideal For:**
- Applications with computationally intensive background processing
- Teams requiring independent deployment cycles
- Services with different scaling requirements
- Applications requiring private internal APIs
- Projects where different components have different technical requirements

**❌ Not Ideal For:**
- Simple CRUD applications
- Single-team projects with tightly coupled functionality
- Applications where network latency isn't a concern
- Projects requiring complex distributed transactions

## Tech Stack & Design Decisions

### Web Application Layer

**TanStack Start** - Full-stack React framework
- **Rationale**: Provides SSR, server functions, and unified development experience
- **Benefits**: Rapid development, built-in optimizations, excellent TypeScript support
- **Trade-offs**: Less architectural flexibility than separate frontend/backend

**Key Dependencies:**
```json
{
  "@tanstack/react-start": "^1.x.x",
  "@tanstack/react-router": "^1.x.x",
  "@tanstack/react-query": "^5.x.x"
}
```

### Microservices Layer

**Cloudflare Workers** - Serverless compute platform
- **Rationale**: Edge computing, excellent service binding support, cost-effective scaling
- **Benefits**: Global distribution, zero cold starts, integrated with other Cloudflare services
- **Trade-offs**: Platform-specific, limited runtime environment

### Communication Layer

**Service Bindings** - Direct worker-to-worker communication
- **Rationale**: Zero latency, type-safe RPC, no additional costs
- **Benefits**: Better than HTTP APIs for internal communication
- **Trade-offs**: Platform-specific, requires careful lifecycle management

### Monorepo Management

**pnpm + Turborepo**
- **pnpm**: Efficient package management with workspace support
- **Turborepo**: Task orchestration and caching across packages
- **Benefits**: Shared dependencies, atomic commits, consistent tooling

## Monorepo Structure

### Directory Layout

```
project-root/
├── apps/
│   ├── web/                    # TanStack Start application
│   │   ├── src/
│   │   │   ├── routes/         # File-based routing
│   │   │   ├── components/     # React components
│   │   │   └── utils/          # Web-specific utilities
│   │   ├── wrangler.jsonc      # Cloudflare configuration
│   │   ├── vite.config.ts      # Build configuration
│   │   └── package.json
│   └── workers/                # Microservice workers
│       ├── data-processor/     # Example: Data processing worker
│       │   ├── src/
│       │   │   └── index.ts    # Worker entrypoint
│       │   ├── wrangler.jsonc
│       │   └── package.json
│       ├── ml-engine/          # Example: ML inference worker
│       └── api-gateway/        # Example: External API aggregation
├── packages/
│   ├── shared-types/           # TypeScript type definitions
│   │   ├── src/
│   │   │   ├── api.ts          # API interfaces
│   │   │   ├── domain.ts       # Domain objects
│   │   │   └── events.ts       # Event schemas
│   │   └── package.json
│   ├── shared-utils/           # Common utilities
│   └── config/                 # Shared configurations
├── scripts/                    # Development and deployment scripts
│   ├── dev.js                  # Multi-worker development
│   └── deploy.js               # Coordinated deployment
├── docs/                       # Documentation
└── package.json                # Root workspace configuration
```

### Package Configuration

**Root package.json:**
```json
{
  "name": "project-monorepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "apps/workers/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "node scripts/dev.js",
    "dev:web": "cd apps/web && pnpm dev",
    "dev:multi": "wrangler dev -c apps/web/wrangler.jsonc -c apps/workers/*/wrangler.jsonc",
    "build": "turbo build",
    "deploy": "node scripts/deploy.js",
    "type-check": "turbo type-check"
  }
}
```

### Shared Types Package

**packages/shared-types/package.json:**
```json
{
  "name": "@project/shared-types",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  }
}
```

**packages/shared-types/src/index.ts:**
```typescript
// Domain types
export interface ProcessingRequest {
  id: string;
  data: unknown;
  priority: 'low' | 'medium' | 'high';
}

export interface ProcessingResult {
  id: string;
  result: unknown;
  status: 'success' | 'error';
  timestamp: Date;
}

// API interfaces
export interface DataProcessorAPI {
  processData(request: ProcessingRequest): Promise<ProcessingResult>;
  getStatus(id: string): Promise<{ status: string }>;
}

export interface MLEngineAPI {
  predict(input: unknown): Promise<unknown>;
  trainModel(data: unknown[]): Promise<{ modelId: string }>;
}
```

## Development Workflow

### Multi-Worker Development

#### Option 1: Single Command (Recommended)

```bash
# Start all workers in one command
npx wrangler dev -c apps/web/wrangler.jsonc -c apps/workers/data-processor/wrangler.jsonc -c apps/workers/ml-engine/wrangler.jsonc
```

**Benefits:**
- Service bindings work automatically
- Single terminal to manage
- Proper binding status display

**Console Output:**
```
Your worker has access to the following bindings:
- Services:
  - DATA_PROCESSOR: data-processor [connected]
  - ML_ENGINE: ml-engine [connected]
```

#### Option 2: Multiple Terminals

```bash
# Terminal 1 - Web application
cd apps/web && pnpm dev

# Terminal 2 - Data processor
cd apps/workers/data-processor && npx wrangler dev --port 8788

# Terminal 3 - ML engine
cd apps/workers/ml-engine && npx wrangler dev --port 8789
```

**Benefits:**
- Independent debugging
- Individual hot reload
- Team autonomy

#### Option 3: Orchestrated Development

**scripts/dev.js:**
```javascript
const { spawn } = require('child_process');
const path = require('path');

const workers = [
  { 
    name: 'web', 
    cmd: 'pnpm', 
    args: ['dev'], 
    cwd: 'apps/web',
    color: '\x1b[36m' // Cyan
  },
  { 
    name: 'data-processor', 
    cmd: 'wrangler', 
    args: ['dev', '--port', '8788'], 
    cwd: 'apps/workers/data-processor',
    color: '\x1b[33m' // Yellow
  },
  { 
    name: 'ml-engine', 
    cmd: 'wrangler', 
    args: ['dev', '--port', '8789'], 
    cwd: 'apps/workers/ml-engine',
    color: '\x1b[35m' // Magenta
  }
];

workers.forEach((worker, index) => {
  const proc = spawn(worker.cmd, worker.args, { 
    cwd: path.resolve(worker.cwd),
    stdio: ['inherit', 'pipe', 'pipe']
  });

  proc.stdout.on('data', (data) => {
    console.log(`${worker.color}[${worker.name}]\x1b[0m ${data.toString().trim()}`);
  });

  proc.stderr.on('data', (data) => {
    console.error(`${worker.color}[${worker.name}]\x1b[0m ${data.toString().trim()}`);
  });

  console.log(`🚀 Started ${worker.name}`);
});
```

### Development Best Practices

1. **Hot Reload Strategy**: Changes to shared packages should trigger rebuilds in dependent workers
2. **Dependency Management**: Use pnpm workspace protocol for internal dependencies
3. **Type Safety**: Run TypeScript checks across all packages before commits
4. **Testing**: Test workers in isolation and integration scenarios

## Service Binding Communication

### Communication Patterns

#### 1. HTTP-Style Communication

**Use Case**: Simple request/response patterns, forwarding external requests

```typescript
// Web worker calling data processor
export default {
  async fetch(request, env) {
    // Forward request to data processor worker
    return await env.DATA_PROCESSOR.fetch(request);
  }
}
```

#### 2. RPC-Style Communication (Recommended)

**Use Case**: Type-safe method calls, complex data processing

**Worker Implementation (apps/workers/data-processor/src/index.ts):**
```typescript
import { ProcessingRequest, ProcessingResult, DataProcessorAPI } from '@project/shared-types';

export class DataProcessorEntrypoint extends WorkerEntrypoint<Env> implements DataProcessorAPI {
  async processData(request: ProcessingRequest): Promise<ProcessingResult> {
    // Implementation logic
    const result = await this.performProcessing(request.data);
    
    return {
      id: request.id,
      result,
      status: 'success',
      timestamp: new Date()
    };
  }

  async getStatus(id: string): Promise<{ status: string }> {
    // Status check logic
    return { status: 'completed' };
  }

  private async performProcessing(data: unknown): Promise<unknown> {
    // Actual processing logic
    return data;
  }
}

export default DataProcessorEntrypoint;
```

**Worker Configuration (apps/workers/data-processor/wrangler.jsonc):**
```jsonc
{
  "name": "data-processor",
  "main": "src/index.ts",
  "compatibility_date": "2024-11-13",
  "compatibility_flags": ["nodejs_compat"]
}
```

**Web Application Usage (apps/web/src/routes/api/process.ts):**
```typescript
import { createServerFn } from '@tanstack/react-start';
import { ProcessingRequest, DataProcessorAPI } from '@project/shared-types';

interface Env {
  DATA_PROCESSOR: DataProcessorAPI;
}

export const processData = createServerFn()
  .handler(async ({ data, context }) => {
    const env = context.cloudflare.env as Env;
    
    const request: ProcessingRequest = {
      id: crypto.randomUUID(),
      data,
      priority: 'high'
    };

    // Direct RPC call - zero latency!
    const result = await env.DATA_PROCESSOR.processData(request);
    
    return result;
  });
```

**Web Configuration (apps/web/wrangler.jsonc):**
```jsonc
{
  "name": "web-app",
  "main": ".output/server/index.mjs",
  "compatibility_date": "2024-11-13",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".output/public"
  },
  "services": [
    {
      "binding": "DATA_PROCESSOR",
      "service": "data-processor",
      "entrypoint": "DataProcessorEntrypoint"
    }
  ]
}
```

### Error Handling and Resilience

```typescript
export const processDataWithFallback = createServerFn()
  .handler(async ({ data, context }) => {
    const env = context.cloudflare.env as Env;
    
    try {
      const result = await env.DATA_PROCESSOR.processData(data);
      return { success: true, result };
    } catch (error) {
      console.error('Data processor failed:', error);
      
      // Fallback to local processing or different worker
      const fallbackResult = await processLocally(data);
      return { success: false, result: fallbackResult, fallback: true };
    }
  });
```

### Service Binding Lifecycle

1. **Binding Resolution**: Wrangler resolves bindings at startup
2. **Connection Status**: Monitor connected/disconnected status during development
3. **Method Invocation**: Direct method calls with automatic serialization
4. **Error Propagation**: Errors propagate across service boundaries
5. **Cleanup**: Automatic cleanup when requests complete

## Deployment Strategy

### Deployment Order Dependencies

Workers must be deployed in dependency order:

```bash
# 1. Deploy dependencies first (workers without service bindings)
wrangler deploy --config apps/workers/data-processor/wrangler.jsonc
wrangler deploy --config apps/workers/ml-engine/wrangler.jsonc

# 2. Deploy dependents (workers with service bindings)
wrangler deploy --config apps/web/wrangler.jsonc
```

### Automated Deployment Script

**scripts/deploy.js:**
```javascript
const { execSync } = require('child_process');
const path = require('path');

const deploymentOrder = [
  // Phase 1: Independent workers
  'apps/workers/data-processor',
  'apps/workers/ml-engine',
  
  // Phase 2: Dependent workers
  'apps/web'
];

async function deploy() {
  for (const workerPath of deploymentOrder) {
    console.log(`🚀 Deploying ${workerPath}...`);
    
    try {
      // Build if package.json has build script
      const packageJson = require(path.resolve(workerPath, 'package.json'));
      if (packageJson.scripts?.build) {
        execSync('pnpm build', { cwd: workerPath, stdio: 'inherit' });
      }
      
      // Deploy with wrangler
      execSync(`wrangler deploy --config ${workerPath}/wrangler.jsonc`, { 
        stdio: 'inherit' 
      });
      
      console.log(`✅ Successfully deployed ${workerPath}`);
    } catch (error) {
      console.error(`❌ Failed to deploy ${workerPath}:`, error.message);
      process.exit(1);
    }
  }
}

deploy().catch(console.error);
```

### Environment Configuration

**Environment-specific Configurations:**

```jsonc
// apps/web/wrangler.jsonc
{
  "name": "web-app",
  "main": ".output/server/index.mjs",
  "services": [
    {
      "binding": "DATA_PROCESSOR",
      "service": "data-processor"
    }
  ],
  "env": {
    "staging": {
      "services": [
        {
          "binding": "DATA_PROCESSOR", 
          "service": "data-processor-staging"
        }
      ]
    }
  }
}
```

### CI/CD Integration

**GitHub Actions Example:**

```yaml
name: Deploy Workers
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          
      - run: pnpm install
      - run: pnpm build
      - run: pnpm deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## Scaling Patterns

### When to Create New Workers

#### ✅ Create Separate Worker For:

1. **Computational Intensity**: CPU/memory intensive operations
2. **Different Scaling Requirements**: Components that scale independently
3. **Team Boundaries**: Code owned by different teams
4. **Security Isolation**: Sensitive operations requiring isolation
5. **External Dependencies**: Integration with specific external services
6. **Performance Requirements**: Sub-components with strict latency requirements

#### ❌ Keep in Main App For:

1. **Simple CRUD Operations**: Basic data manipulation
2. **UI Logic**: User interface state and interactions
3. **Authentication**: User session management
4. **Configuration**: Application settings and preferences

### Worker Communication Patterns

#### 1. Chain Pattern
```
Web App → Worker A → Worker B → Worker C
```

**Use Case**: Sequential processing pipeline

```typescript
// Worker A calls Worker B
export class WorkerAEntrypoint extends WorkerEntrypoint {
  async processStep1(data: unknown): Promise<unknown> {
    const intermediateResult = await this.performStepA(data);
    
    // Chain to Worker B
    const finalResult = await this.env.WORKER_B.processStep2(intermediateResult);
    
    return finalResult;
  }
}
```

#### 2. Fan-out Pattern
```
Web App → Worker A ┌→ Worker B
                   ├→ Worker C  
                   └→ Worker D
```

**Use Case**: Parallel processing, aggregation

```typescript
export class OrchestratorEntrypoint extends WorkerEntrypoint {
  async processParallel(data: unknown): Promise<unknown[]> {
    // Fan out to multiple workers
    const [resultB, resultC, resultD] = await Promise.all([
      this.env.WORKER_B.process(data),
      this.env.WORKER_C.process(data),
      this.env.WORKER_D.process(data)
    ]);
    
    return [resultB, resultC, resultD];
  }
}
```

#### 3. Event-Driven Pattern

**Use Case**: Decoupled communication via queues

```typescript
// Producer worker
export class ProducerEntrypoint extends WorkerEntrypoint {
  async produceEvent(data: unknown): Promise<void> {
    await this.env.EVENT_QUEUE.send({
      type: 'data_processed',
      payload: data,
      timestamp: Date.now()
    });
  }
}

// Consumer worker (queue consumer)
export default {
  async queue(batch, env) {
    for (const message of batch.messages) {
      await this.processEvent(message.body);
    }
  }
}
```

### Performance Considerations

#### Service Binding Limits

- **Maximum 32 worker invocations** per request chain
- Each service binding call counts toward subrequest limit
- No additional latency for same-thread execution
- No cost for service binding calls

#### Optimization Strategies

1. **Minimize Worker Hops**: Avoid long chains of worker calls
2. **Batch Operations**: Group multiple operations into single calls
3. **Cache Results**: Use appropriate caching strategies
4. **Smart Placement**: Enable for optimal geographic distribution

## Best Practices

### Code Organization

#### 1. Shared Type Definitions

**Centralized APIs:**
```typescript
// packages/shared-types/src/workers.ts
export interface WorkerRegistry {
  'data-processor': DataProcessorAPI;
  'ml-engine': MLEngineAPI;
  'notification-service': NotificationAPI;
}

// Type-safe environment
export interface WorkerEnv {
  [K in keyof WorkerRegistry]: WorkerRegistry[K];
}
```

#### 2. Worker Interface Standards

**Consistent Entrypoint Pattern:**
```typescript
// Base class for all workers
export abstract class BaseWorkerEntrypoint<T = unknown> extends WorkerEntrypoint<T> {
  abstract getHealth(): Promise<{ status: 'healthy' | 'unhealthy' }>;
  abstract getMetrics(): Promise<Record<string, number>>;
}

// Implementation
export class DataProcessorEntrypoint extends BaseWorkerEntrypoint<Env> {
  async getHealth() {
    return { status: 'healthy' as const };
  }
  
  async getMetrics() {
    return { 
      processedCount: await this.getProcessedCount(),
      errorRate: await this.getErrorRate()
    };
  }
}
```

### Testing Strategies

#### 1. Unit Testing Workers

```typescript
// apps/workers/data-processor/test/index.test.ts
import { DataProcessorEntrypoint } from '../src/index';

describe('DataProcessorEntrypoint', () => {
  let worker: DataProcessorEntrypoint;
  
  beforeEach(() => {
    worker = new DataProcessorEntrypoint();
  });
  
  it('should process data correctly', async () => {
    const request = { id: '1', data: 'test', priority: 'high' as const };
    const result = await worker.processData(request);
    
    expect(result.status).toBe('success');
    expect(result.id).toBe('1');
  });
});
```

#### 2. Integration Testing

```typescript
// test service binding integration
describe('Service Binding Integration', () => {
  it('should communicate between workers', async () => {
    // Use miniflare for local testing
    const mf = new Miniflare({
      workers: [
        {
          name: 'web',
          scriptPath: 'apps/web/dist/index.js',
          serviceBindings: {
            'DATA_PROCESSOR': 'data-processor'
          }
        },
        {
          name: 'data-processor',
          scriptPath: 'apps/workers/data-processor/dist/index.js'
        }
      ]
    });
    
    const response = await mf.dispatchFetch('http://localhost/', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' })
    });
    
    expect(response.status).toBe(200);
  });
});
```

### Monitoring and Observability

#### 1. Structured Logging

```typescript
export class DataProcessorEntrypoint extends WorkerEntrypoint<Env> {
  async processData(request: ProcessingRequest): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    console.log(JSON.stringify({
      level: 'info',
      message: 'Processing started',
      requestId: request.id,
      priority: request.priority,
      timestamp: new Date().toISOString()
    }));
    
    try {
      const result = await this.performProcessing(request.data);
      
      console.log(JSON.stringify({
        level: 'info',
        message: 'Processing completed',
        requestId: request.id,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }));
      
      return {
        id: request.id,
        result,
        status: 'success',
        timestamp: new Date()
      };
    } catch (error) {
      console.error(JSON.stringify({
        level: 'error',
        message: 'Processing failed',
        requestId: request.id,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }));
      
      throw error;
    }
  }
}
```

#### 2. Metrics Collection

```typescript
// Analytics Engine integration
export class MetricsCollector {
  constructor(private analyticsEngine: any) {}
  
  async recordProcessingMetrics(duration: number, success: boolean) {
    await this.analyticsEngine.writeDataPoint({
      'blobs': [
        Date.now().toString(),
        'data-processor',
        success ? 'success' : 'error'
      ],
      'doubles': [duration],
      'indexes': ['timestamp', 'worker', 'status']
    });
  }
}
```

### Security Considerations

#### 1. Worker Isolation

- **Private Workers**: Workers not exposed to public internet should not have routes
- **Service-Only Access**: Use service bindings exclusively for internal communication
- **Least Privilege**: Only bind necessary services to each worker

#### 2. Data Validation

```typescript
import { z } from 'zod';

const ProcessingRequestSchema = z.object({
  id: z.string().uuid(),
  data: z.unknown(),
  priority: z.enum(['low', 'medium', 'high'])
});

export class DataProcessorEntrypoint extends WorkerEntrypoint<Env> {
  async processData(rawRequest: unknown): Promise<ProcessingResult> {
    // Validate input at service boundaries
    const request = ProcessingRequestSchema.parse(rawRequest);
    
    // Process validated data
    return await this.performProcessing(request);
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Service Binding Not Connected

**Symptoms:**
- `[not connected]` status in wrangler dev
- `TypeError: env.WORKER_NAME is undefined`

**Solutions:**
- Ensure target worker is running (`wrangler dev` in worker directory)
- Check service binding configuration in `wrangler.jsonc`
- Verify worker names match between binding and actual worker name

#### 2. Type Errors in Service Calls

**Symptoms:**
- TypeScript errors when calling worker methods
- Runtime errors about missing methods

**Solutions:**
- Ensure shared types are properly exported
- Verify worker implements declared interface
- Check that all workers are using same version of shared types

#### 3. Deployment Failures

**Symptoms:**
- Service binding target does not exist during deployment
- Circular dependency errors

**Solutions:**
- Deploy workers in correct dependency order
- Check for circular service bindings
- Ensure all referenced workers are deployed first

### Debugging Strategies

#### 1. Development Debugging

```typescript
// Add debug logging for service calls
export const processDataWithDebug = createServerFn()
  .handler(async ({ data, context }) => {
    const env = context.cloudflare.env as Env;
    
    console.log('Calling DATA_PROCESSOR with:', data);
    
    try {
      const result = await env.DATA_PROCESSOR.processData(data);
      console.log('DATA_PROCESSOR returned:', result);
      return result;
    } catch (error) {
      console.error('DATA_PROCESSOR failed:', error);
      throw error;
    }
  });
```

#### 2. Production Monitoring

```typescript
// Health check endpoints for each worker
export class DataProcessorEntrypoint extends WorkerEntrypoint<Env> {
  async getHealth(): Promise<{ status: string; timestamp: string; version: string }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.VERSION || 'unknown'
    };
  }
}
```

### Performance Debugging

#### 1. Latency Tracking

```typescript
export class PerformanceTracker {
  private startTime: number;
  
  constructor() {
    this.startTime = performance.now();
  }
  
  measure(operation: string): number {
    const duration = performance.now() - this.startTime;
    console.log(`${operation} took ${duration}ms`);
    return duration;
  }
}
```

#### 2. Service Binding Analytics

```typescript
// Track service binding performance
export const processDataWithMetrics = createServerFn()
  .handler(async ({ data, context }) => {
    const env = context.cloudflare.env as Env;
    const tracker = new PerformanceTracker();
    
    const result = await env.DATA_PROCESSOR.processData(data);
    
    tracker.measure('DATA_PROCESSOR.processData');
    
    return result;
  });
```

---

## Conclusion

This architecture provides a scalable foundation for building complex applications that require both rapid development velocity and the benefits of microservices architecture. The key is knowing when to keep functionality unified versus when to separate it, and leveraging Cloudflare's service bindings for efficient communication between services.

The patterns described in this document should be applied thoughtfully based on your specific requirements, team structure, and performance needs. Start with a unified approach and gradually extract workers as complexity and team boundaries require it.