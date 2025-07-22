# Autoflow

**Autoflow** is a modern workflow automation platform that empowers users to visually design, automate, and manage business processes by connecting a variety of services and data sources. With an intuitive drag-and-drop interface, users can build complex workflows that integrate with cloud services, databases, messaging platforms, and AI tools—all without writing code. Autoflow is designed for teams and organizations seeking to streamline operations, automate repetitive tasks, and enable seamless integrations across their tech stack.

---

## Overview

Autoflow enables you to visually create, edit, and run automated workflows that integrate with various services (email, Slack, APIs, databases, AI, and more). The platform consists of a React/TypeScript frontend and a Node.js/Express/Prisma backend with a PostgreSQL database.

---

## Features

- **Visual Workflow Editor**: Drag-and-drop nodes to build automation flows.
- **OAuth & Organization Requirement**: Most nodes require you to connect via OAuth and be part of a reliable organization account. This ensures secure and authorized access to third-party integrations.
- **Limited Node Availability**: For now, only a subset of nodes are available while the platform is in early development. More integrations and node types will be added soon.
- **Triggers**: Webhook, schedule, S3 file, file upload, and more.
- **Actions**: Send email, Slack message, API requests, push to Airtable, database operations, and more.
- **Data Processing**: Parse CSV, enrich data via API, etc.
- **AI Integrations**: PDF text extraction, text summarization (OpenAI, HuggingFace).
- **Logic Nodes**: If/Else, Loop, etc.
- **Integrations**: Google, Slack, Airtable, Firebase, Redis, PostgreSQL, S3, and more.
- **User Authentication**: Register, login, and profile management.
- **Workflow Run History**: Track and view past workflow executions.

---

## Architecture

```
[ React Frontend ]  <-->  [ Node.js/Express Backend ]  <-->  [ PostgreSQL (Prisma ORM) ]
```

- **Frontend**: React, TypeScript, Vite, TailwindCSS, React Flow
- **Backend**: Node.js, Express, Prisma, BullMQ (queue), Redis (for queue), PostgreSQL
- **Integrations**: OAuth for Google/Slack/Airtable, SMTP, external APIs

---

## Quick Start

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- PostgreSQL database
- Redis (for workflow queue)
- BullMQ

### 1. Clone the repository
```sh
git clone <your-repo-url>
cd autoflow2
```

### 2. Backend Setup
```sh
cd autoflow-backend
npm install
npx prisma migrate deploy  # Or: npx prisma migrate dev
npm run dev
```

### 3. Frontend Setup
```sh
cd ../autoflow-frontend
npm install
npm run dev
```

The frontend will run on [http://localhost:5173](http://localhost:5173) by default.

---

## Database
- Uses PostgreSQL
- Prisma ORM models: User, Workflow, UserIntegration, WorkflowRun
- Migrations are in `autoflow-backend/prisma/migrations/`

---

## Usage
- Register a new account or login
- Create a new workflow from the dashboard
- Drag nodes (triggers, actions, logic, integrations) onto the canvas
- Configure each node (API keys, parameters, etc.)
- Save and run your workflow
- View run history and results

---

## Supported Nodes (Examples)
- **Triggers**: Webhook, Schedule, S3 File, File Upload *(only a subset may be available in the current version)*
- **Actions**: Send Email, Slack Notification, API Request, Airtable, Database (Postgres, Firebase, Redis) *(availability may be limited)*
- **Data Processing**: Parse CSV, Enrich Data *(availability may be limited)*
- **AI**: PDF Extract, AI Summarizer *(availability may be limited)*
- **Logic**: If/Else, Loop *(availability may be limited)*

---

## Development
- Backend: `cd autoflow-backend && npm run dev`
- Frontend: `cd autoflow-frontend && npm run dev`
- Shared node schemas: `shared/nodeSchemas.ts`

---

## License
MIT (or your license here) 
