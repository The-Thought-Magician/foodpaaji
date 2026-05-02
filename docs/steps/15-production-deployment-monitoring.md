# Step 15: Production Deployment & Monitoring

## Description
Deploy application to production, set up monitoring, logging, and alerting systems.

## Duration
1 day

## Detailed Implementation Spec

### 15.1 Production Deployment
- Deploy backend to production server/cloud platform
- Deploy frontend to CDN or web server
- Verify database connectivity
- Run smoke tests
- Monitor initial deployment

### 15.2 Monitoring Setup
- Application Performance Monitoring (APM)
- Error tracking and reporting
- Real-time metrics collection
- Performance dashboards

### 15.3 Logging Configuration
- Centralized log collection
- Structured logging format
- Log retention policies
- Search and analysis tools

### 15.4 Alerting System
- Critical error alerts
- Performance degradation alerts
- Resource availability alerts
- Notification channels (email, Slack, PagerDuty)

### 15.5 Post-Deployment Verification
- Smoke tests
- User acceptance testing
- Monitoring dashboard review
- Team communication

## Code Examples

### Logging Configuration (src/config/logging.js)
```javascript
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'foodpaaji-api' },
  transports: [
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxDays: '14d',
      level: 'error'
    }),
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxDays: '14d'
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
```

### Request Logging Middleware (src/middleware/requestLogger.js)
```javascript
const logger = require('../config/logging');

const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };

    if (res.statusCode >= 400) {
      logger.error('Request failed', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
};

module.exports = requestLogger;
```

### Error Tracking (src/config/sentry.js)
```javascript
const Sentry = require('@sentry/node');
const Tracing = require('@sentry/tracing');

const initSentry = (app) => {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Tracing.Integrations.Express({ app })
    ]
  });

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
};

const captureException = (error, context = {}) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, { contexts: { custom: context } });
  }
};

const errorHandler = (app) => {
  app.use(Sentry.Handlers.errorHandler());
};

module.exports = { initSentry, captureException, errorHandler };
```

### Monitoring Metrics (src/middleware/metrics.js)
```javascript
const prometheus = require('prom-client');

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const databaseQueryDuration = new prometheus.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1]
});

prometheus.register.registerMetric(httpRequestDuration);
prometheus.register.registerMetric(httpRequestTotal);
prometheus.register.registerMetric(databaseQueryDuration);

const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
    httpRequestTotal
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .inc();
  });

  next();
};

const metricsEndpoint = (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
};

module.exports = {
  metricsMiddleware,
  metricsEndpoint,
  databaseQueryDuration
};
```

### Alerting Configuration (monitoring/alerts.yml)
```yaml
groups:
  - name: foodpaaji_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}"

      - alert: SlowDatabaseQueries
        expr: histogram_quantile(0.95, rate(database_query_duration_seconds[5m])) > 1
        for: 10m
        annotations:
          summary: "Slow database queries detected"

      - alert: HighCPUUsage
        expr: node_cpu_seconds_total{mode="user"} > 0.8
        for: 5m
        annotations:
          summary: "High CPU usage"

      - alert: LowDiskSpace
        expr: node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.1
        for: 5m
        annotations:
          summary: "Low disk space ({{ $value | humanizePercentage }})"

      - alert: DatabaseDown
        expr: mongodb_up == 0
        for: 1m
        annotations:
          summary: "MongoDB is down"
```

### Smoke Tests (tests/smoke.test.js)
```javascript
const axios = require('axios');

describe('Smoke Tests', () => {
  const baseURL = process.env.API_URL || 'https://api.foodpaaji.com';
  const client = axios.create({ baseURL });

  it('should respond to health check', async () => {
    const response = await client.get('/health');
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('ok');
  });

  it('should return restaurants list', async () => {
    const response = await client.get('/api/v1/restaurants');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data.data)).toBe(true);
  });

  it('should handle authentication', async () => {
    try {
      await client.get('/api/v1/orders');
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });

  it('should connect to database', async () => {
    const response = await client.get('/health');
    expect(response.data.database).toBe('connected');
  });
});
```

### Monitoring Dashboard Configuration
```javascript
// monitoring/grafana-dashboard.json
{
  "dashboard": {
    "title": "Foodpaaji Production Dashboard",
    "panels": [
      {
        "title": "Requests Per Second",
        "targets": [
          {
            "expr": "rate(http_requests_total[1m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[1m])"
          }
        ]
      },
      {
        "title": "API Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds)"
          }
        ]
      },
      {
        "title": "Database Query Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, database_query_duration_seconds)"
          }
        ]
      },
      {
        "title": "Active Users",
        "targets": [
          {
            "expr": "count(increase(http_requests_total[5m]) > 0)"
          }
        ]
      }
    ]
  }
}
```

### Production Deployment Script (scripts/deploy.sh)
```bash
#!/bin/bash

set -e

echo "Starting production deployment..."

# Load environment
source .env.production

# Check health
echo "Checking current system health..."
curl -f https://api.foodpaaji.com/health || exit 1

# Run smoke tests
echo "Running smoke tests..."
npm run test:smoke

# Build Docker image
echo "Building Docker image..."
docker build -t foodpaaji:${VERSION} .

# Push to registry
echo "Pushing to registry..."
docker tag foodpaaji:${VERSION} ${REGISTRY}/foodpaaji:${VERSION}
docker tag foodpaaji:${VERSION} ${REGISTRY}/foodpaaji:latest
docker push ${REGISTRY}/foodpaaji:${VERSION}
docker push ${REGISTRY}/foodpaaji:latest

# Deploy to production
echo "Deploying to production..."
kubectl set image deployment/foodpaaji-api \
  foodpaaji-api=${REGISTRY}/foodpaaji:${VERSION} \
  -n production

# Wait for rollout
echo "Waiting for rollout to complete..."
kubectl rollout status deployment/foodpaaji-api -n production --timeout=5m

# Verify deployment
echo "Verifying deployment..."
curl -f https://api.foodpaaji.com/health || {
  echo "Health check failed, rolling back..."
  kubectl rollout undo deployment/foodpaaji-api -n production
  exit 1
}

echo "Deployment successful!"
```

## Acceptance Criteria
- [ ] Application is successfully deployed to production
- [ ] All health checks pass
- [ ] Monitoring dashboard is operational
- [ ] Logs are being collected centrally
- [ ] Alerting system is configured and tested
- [ ] Error tracking captures all exceptions
- [ ] Performance metrics are being collected
- [ ] Smoke tests pass in production
- [ ] SSL/TLS certificate is valid
- [ ] Database backups are running
- [ ] Scaling policies are configured
- [ ] Load balancing is working
- [ ] CDN is serving static assets
- [ ] All critical workflows are functional
- [ ] Team communication is established
- [ ] Rollback procedures are tested
- [ ] Post-deployment monitoring shows green status
