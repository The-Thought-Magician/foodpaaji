# Step 1: Project Setup & Environment Configuration

## Description
Set up development environment, install dependencies, configure tooling, and establish project structure.

## Duration
1 day

## Detailed Implementation Spec

### 1.1 Development Environment Setup
- Install Node.js (latest LTS version) and npm
- Configure VS Code or preferred IDE with necessary extensions
- Set up git configuration (user.name, user.email)
- Initialize git repository with proper .gitignore

### 1.2 Project Structure
```
foodpaaji/
├── src/
│   ├── api/
│   ├── services/
│   ├── models/
│   ├── middleware/
│   ├── utils/
│   └── config/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
├── public/
├── config/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

### 1.3 Dependencies Installation
- Initialize npm project: `npm init -y`
- Install core dependencies:
  - Express.js (API framework)
  - dotenv (environment management)
  - cors (cross-origin resource sharing)
  - helmet (security headers)
  - morgan (HTTP request logger)
- Install dev dependencies:
  - nodemon (development auto-reload)
  - jest (testing framework)
  - eslint (code linting)
  - prettier (code formatting)

### 1.4 Tooling Configuration
- Configure .eslintrc.json for code quality
- Configure prettier for consistent formatting
- Set up .gitignore with Node.js standard entries
- Create .env.example with required variables

### 1.5 Initial Project Files
- Create entry point: `src/index.js`
- Create .env file from .env.example
- Set up basic express server listening on port 3000
- Configure environment variables for development

## Code Examples

### package.json Scripts
```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  }
}
```

### src/index.js Template
```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Acceptance Criteria
- [ ] Development environment is configured and tested
- [ ] All dependencies are installed and working (npm ls shows no errors)
- [ ] Project structure is established with all directories created
- [ ] Git repository is initialized with proper .gitignore
- [ ] npm start and npm dev commands work without errors
- [ ] Health check endpoint responds successfully
- [ ] .env file created from .env.example
- [ ] ESLint and Prettier are configured and functional
- [ ] Package.json includes all necessary scripts
- [ ] README.md contains basic project overview
