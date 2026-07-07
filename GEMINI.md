# cmiSearch - Project Instructions & Guidelines

This document serves as the primary engineering instructions and workspace guidelines for `cmiSearch`. It provides developers and AI assistants with context regarding the system architecture, build commands, test patterns, and code conventions to maintain high-quality contributions.

---

## 1. Project Overview

`cmiSearch` is a serverless application built with the AWS Serverless Application Model (AWS SAM) and Node.js. It implements a search capability over "CMI Teaching" data backed by Amazon DynamoDB.

### Key Technologies & Stack
- **Runtime Environment:** Node.js (targeted at version `24.x` via `template.yaml`, but supports Node `22.x+` in packages).
- **Module System:** ES Modules (ESM) using `.mjs` file extensions.
- **Serverless Framework:** AWS Serverless Application Model (SAM).
- **Database:** Amazon DynamoDB (and DynamoDB Local for development).
- **Containerization:** Docker & Docker Compose for hosting local DynamoDB.
- **Testing Framework:** Jest with ES module support, utilizing `aws-sdk-client-mock` to mock DynamoDB operations.

### Core Architecture & Flow
1. **AWS SAM Configuration:** Defined in `template.yaml`. Only the `searchFunction` is active.
2. **Lambda Handler:** `src/handlers/search.mjs` containing the `searchHandler` function.
3. **Database Integration:** The search service executes query operations against a DynamoDB table named `cmiSearch`.
4. **Local Network Topology:**
   - A local DynamoDB instance runs in a Docker container under service `dynamodb-local` (container name: `local-dynamodb`).
   - The Lambda handler is coded to connect directly to the container endpoint `http://local-dynamodb:8000`.
   - To make this work locally, the SAM API is executed inside the same Docker network (`cmisearch_default`), enabling the Lambda container to resolve the `local-dynamodb` hostname.

---

## 2. Directory Structure

```text
cmiSearch/
├── .gitignore              # Git ignore file
├── buildspec.yml           # AWS CodeBuild specification
├── docker-compose.yml      # Local DynamoDB orchestrator
├── env.json                # Environment variables override for local execution
├── makefile                # Automation scripts for auth and running locally
├── package.json            # NPM dependencies, scripts, and Jest configurations
├── querySearch.sh          # Example shell script querying DynamoDB local via AWS CLI
├── README.md               # User-facing README with setup instructions
├── samconfig.toml          # SAM deployment CLI settings
├── template.yaml           # AWS SAM Infrastructure-as-code template
├── __tests__/              # Automated tests
│   └── unit/
│       ├── handlers/       # Handler unit tests (e.g., search.test.mjs)
│       └── utils/          # Utility unit tests (e.g., searchFilter.test.mjs)
└── src/
    ├── handlers/           # Serverless Lambda handlers
    │   └── search.mjs      # Core search function handler
    └── utils/              # Utility modules (e.g., searchFilter.mjs)
```

---

## 3. Building and Running

### Prerequisites
Make sure you have the following tools installed on your host system:
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
- [Docker](https://www.docker.com/) and Docker Compose
- [Node.js](https://nodejs.org/) (Version 22.x or 24.x)

### Local Environment Setup & Execution

1. **Install Node Dependencies:**
   ```bash
   npm install
   ```

2. **Start Local DynamoDB:**
   Run DynamoDB local in the background with persistent data mapping to `./dynamodata`:
   ```bash
   docker compose up -d
   ```

3. **Verify/Create the Local DynamoDB Table:**
   Create the table `cmiSearch` with `source` as the Hash key (Partition Key) and `sk` as the Range key (Sort Key):
   ```bash
   aws dynamodb create-table \
     --table-name cmiSearch \
     --attribute-definitions AttributeName=source,AttributeType=S AttributeName=sk,AttributeType=S \
     --key-schema AttributeName=source,KeyType=HASH AttributeName=sk,KeyType=RANGE \
     --billing-mode PAY_PER_REQUEST \
     --endpoint-url http://127.0.0.1:8000 \
     --region us-east-1
   ```

4. **Verify Table/Add Seed Data:**
   You can query the database or put test items using the AWS CLI or `querySearch.sh`.
   ```bash
   # Scan table
   aws dynamodb scan --table-name cmiSearch --endpoint-url http://127.0.0.1:8000 --region us-east-1
   ```

5. **Build and Run the Local API Gateway:**
   Use the `makefile` target to log in to ECR public registry and spin up the SAM Local API:
   ```bash
   make run-local
   ```
   *Note:* The local API will mount the Lambda handlers on `http://localhost:3000`. It launches SAM API on the `cmisearch_default` Docker network so it can communicate with `local-dynamodb`.

6. **Trigger the Search Endpoint:**
   Send a `POST` request to `http://localhost:3000/` with JSON payloads:
   ```bash
   curl -X POST http://localhost:3000/ \
     -H "Content-Type: application/json" \
     -d '{"source": "ftcm", "query": "1801"}'
   ```

---

## 4. Testing

This project uses Jest for unit tests. Since ES modules are used, Jest is configured to run with VM modules enabled.

### Run Unit Tests
To run all tests in the project, run:
```bash
npm test
```
*Behind the scenes, this executes:*
```bash
node --experimental-vm-modules ./node_modules/jest/bin/jest.js
```

### Test Mocks
Always use `aws-sdk-client-mock` to spy on and mock `DynamoDBDocumentClient` commands inside tests, as seen in `__tests__/unit/handlers/search.test.mjs`.

---

## 5. Development Conventions

To maintain a consistent and secure codebase, abide by the following:

### Coding Style & Language Standards
- **ES Modules (ESM):** All new files must use ES Module imports (`import`/`export`) and the `.mjs` extension unless there is a specific reason to use `.js` (CommonJS).
- **Asynchronous Code:** Prefer modern `async/await` syntax for asynchronous logic. Avoid nested callbacks.
- **Node.js SDK:** Use AWS SDK v3 libraries exclusively. Import from `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb`. Do not use AWS SDK v2 (`aws-sdk`).

### Security Protocols
- **No Hardcoded Secrets:** Never store passwords, access keys, or production configuration strings in source code or template definitions.
- **Strict Environment Separation:** Keep development, testing, and production variables isolated. Use local environment configuration variables mapped from SAM parameters and `env.json` where appropriate.

### Surgical Updates & Git
- **Targeted Edits:** Always write targeted, surgical updates. Do not refactor unrelated codebase layers.
- **Source Control:** Do NOT stage or commit changes to git unless explicitly requested by the user. If preparing a commit, follow the guidelines to inspect `git status` and `git diff` first, matching local commit styles.
- **Test Alignment:** Every bug fix or feature must include appropriate automated test updates in the `__tests__` directory to verify its behavioral correctness.
