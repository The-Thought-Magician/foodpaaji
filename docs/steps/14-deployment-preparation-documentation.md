# Step 14: Deployment Preparation & Documentation

## Description
Configure deployment environments, create deployment guides, and document system architecture.

## Duration
2 days

## Detailed Implementation Spec

### 14.1 Deployment Environment Configuration
- Set up production, staging, and development environments
- Configure environment variables for each environment
- Create .env.production, .env.staging, .env.development files
- Secure sensitive credentials using environment variable management

### 14.2 CI/CD Pipeline Setup
- Configure GitHub Actions or similar CI/CD tool
- Automated testing on every push
- Automated linting and code quality checks
- Automated deployment on merge to main
- Set up build and deployment scripts

### 14.3 Infrastructure Configuration
- Docker containerization
- Kubernetes deployment configuration (optional)
- Load balancer configuration
- Database backups and recovery

### 14.4 Documentation
- System architecture documentation
- API documentation
- Deployment guide
- Troubleshooting guide
- Runbooks for common operations

### 14.5 Monitoring and Alerting
- Configure logging services
- Set up error tracking
- Implement health checks
- Create alerts for critical issues

## Code Examples

### Docker Configuration (Dockerfile)
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node healthcheck.js

CMD ["npm", "start"]
```

### Docker Compose (docker-compose.yml)
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: foodpaaji-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: foodpaaji
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}

  redis:
    image: redis:7-alpine
    container_name: foodpaaji-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: .
    container_name: foodpaaji-backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://${MONGO_USER}:${MONGO_PASSWORD}@mongodb:27017/foodpaaji
      - REDIS_HOST=redis
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    depends_on:
      - mongodb
      - redis
    volumes:
      - ./logs:/app/logs

volumes:
  mongodb_data:
  redis_data:
```

### GitHub Actions CI/CD (.github/workflows/deploy.yml)
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:6.0
        options: >-
          --health-cmd mongosh
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm run test:coverage
        env:
          MONGODB_URI: mongodb://localhost:27017/foodpaaji-test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t foodpaaji:latest .

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Push Docker image
        run: |
          docker tag foodpaaji:latest ${{ secrets.DOCKER_USERNAME }}/foodpaaji:latest
          docker push ${{ secrets.DOCKER_USERNAME }}/foodpaaji:latest

      - name: Deploy to production
        run: |
          curl -X POST ${{ secrets.DEPLOY_WEBHOOK_URL }} \
            -H "Content-Type: application/json" \
            -d '{"version":"latest"}'
```

### Environment Configuration (.env.example)
```
# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://foodpaaji.com

# Database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/foodpaaji
MONGO_USER=root
MONGO_PASSWORD=your_secure_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT
JWT_SECRET=your_very_secure_secret_key_change_this
JWT_REFRESH_SECRET=your_very_secure_refresh_key_change_this

# Email Service
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Payment Gateway
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLIC_KEY=pk_live_xxxxx

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Monitoring
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

### System Architecture Documentation (docs/ARCHITECTURE.md)
```markdown
# Foodpaaji System Architecture

## Overview
Foodpaaji is a food ordering platform built with Node.js/Express backend and React frontend.

## Technology Stack
- **Backend**: Node.js, Express.js
- **Frontend**: React, Redux
- **Database**: MongoDB
- **Cache**: Redis
- **Authentication**: JWT
- **Deployment**: Docker, Kubernetes

## System Components

### Backend
- API Server (Express.js)
- Service Layer (Business Logic)
- Data Layer (MongoDB)
- Cache Layer (Redis)

### Frontend
- Web Application (React)
- State Management (Redux)
- Component Library

### Infrastructure
- Load Balancer
- Container Registry
- Database Cluster
- Cache Cluster

## Data Flow

1. User requests come to API Gateway
2. Request is routed to appropriate microservice
3. Service processes business logic
4. Data is fetched from database or cache
5. Response is returned to client

## Deployment Architecture

```
Internet
  |
  v
Load Balancer (Nginx)
  |
  +---> API Server Instance 1
  +---> API Server Instance 2
  +---> API Server Instance 3
  |
  v
MongoDB Replica Set
  |
  v
Redis Cache Cluster
```

## Security Measures
- HTTPS/TLS encryption
- JWT authentication
- Rate limiting
- Input validation
- XSS protection
- CORS configuration
```

### Deployment Runbook (docs/DEPLOYMENT_RUNBOOK.md)
```markdown
# Deployment Runbook

## Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Database migrations ready
- [ ] Rollback plan documented
- [ ] Team notified

## Deployment Steps

### 1. Create Release
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

### 2. Build and Push Docker Image
```bash
docker build -t foodpaaji:1.0.0 .
docker tag foodpaaji:1.0.0 registry.com/foodpaaji:1.0.0
docker push registry.com/foodpaaji:1.0.0
```

### 3. Update Kubernetes Deployment
```bash
kubectl set image deployment/foodpaaji-api \
  foodpaaji-api=registry.com/foodpaaji:1.0.0 \
  -n production
```

### 4. Verify Deployment
```bash
kubectl rollout status deployment/foodpaaji-api -n production
kubectl get pods -n production
```

### 5. Run Health Checks
```bash
curl -s https://api.foodpaaji.com/health | jq .
```

## Rollback Procedure

If deployment fails:

```bash
kubectl rollout undo deployment/foodpaaji-api -n production
kubectl rollout status deployment/foodpaaji-api -n production
```

## Post-Deployment
- Monitor error logs
- Check performance metrics
- Verify API functionality
- Test critical workflows
```

### Health Check Endpoint (src/routes/health.js)
```javascript
const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');

const router = express.Router();

router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || 'unknown'
  };

  try {
    // Check database
    if (mongoose.connection.readyState === 1) {
      health.database = 'connected';
    } else {
      health.database = 'disconnected';
      health.status = 'degraded';
    }

    // Check Redis
    // Add redis health check

    res.status(health.status === 'ok' ? 200 : 503).json(health);
  } catch (error) {
    health.status = 'error';
    health.error = error.message;
    res.status(503).json(health);
  }
});

module.exports = router;
```

## Acceptance Criteria
- [ ] Deployment pipeline is configured and tested
- [ ] Environment configurations are documented
- [ ] System architecture documentation is complete
- [ ] Runbooks exist for common operations
- [ ] Health checks are implemented
- [ ] Monitoring and alerting are configured
- [ ] Logging is centralized
- [ ] Database backups are automated
- [ ] Rollback procedures are documented and tested
- [ ] Load balancing is configured
- [ ] SSL/TLS certificates are valid
- [ ] Environment variables are secure
- [ ] Docker images build successfully
- [ ] CI/CD pipeline runs all checks
