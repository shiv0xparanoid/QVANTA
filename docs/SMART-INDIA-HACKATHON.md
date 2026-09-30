# QVANTA
## Smart India Hackathon Technical Proposal

### Project Type
Quantum computing education and simulation platform.

### Implementation Basis
This document describes the behavior implemented in the QVANTA codebase. It does not add product features or claims that are not represented in the repository.

## 1. Problem Addressed

Quantum computing concepts are difficult to learn because students need to understand theory, circuit construction, code, simulation output, and measurement behavior together.

QVANTA addresses this learning workflow through an application that combines:

- interactive quantum circuit construction
- Qiskit-based circuit simulation
- measurement result visualization
- lesson modules and progress data
- an AI tutor connected to lesson content and circuit context
- user authentication, usage limits, and subscription handling

## 2. Proposed Solution

QVANTA provides a browser-based quantum learning environment. An authenticated user can create a circuit, place gates, edit the equivalent Qiskit-style code, run the circuit through a simulator, inspect measurement histograms, and ask the tutor questions about quantum computing or the current circuit.

The system is divided into three runtime applications:

1. **Web application**: React and Vite frontend.
2. **Platform API**: Node.js and Express backend.
3. **Simulator service**: Python FastAPI service using Qiskit Aer.

PostgreSQL stores application data through Prisma. Redis is available for simulator job storage and messaging.

## 3. System Architecture

```text
Browser
  |
  | React + Vite frontend
  | /api requests with JWT access token
  v
Node.js Express API
  |
  |-- PostgreSQL through Prisma
  |-- Redis client and usage-related infrastructure
  |-- Stripe billing integration
  |-- Optional Google OAuth
  |-- Optional Anthropic Claude tutor integration
  v
Python FastAPI Simulator
  |
  |-- Qiskit circuit parsing
  |-- Qiskit Aer execution
  |-- Optional Redis job state
  v
Simulation results
```

### Repository Components

- `apps/web`: frontend pages, routing, state management, circuit UI, tutor UI, and simulation result display.
- `apps/api`: authentication, users, circuits, lessons, tutor, simulations, billing, admin, and health routes.
- `apps/simulator`: FastAPI service that parses and executes circuit representations.
- `packages/types`: shared TypeScript types.
- `packages/ui`: shared React UI components and Tailwind configuration.
- `infra`: Dockerfiles and Docker Compose configuration for infrastructure services.

## 4. Backend Implementation

### Express API

The API starts in `apps/api/src/main.ts`. It configures:

- Helmet security headers
- CORS with credential support
- cookie parsing
- JSON request parsing
- raw request handling for Stripe webhooks
- Passport initialization
- route modules
- centralized application and unexpected-error responses

The available route groups are:

- `/auth`
- `/users`
- `/billing`
- `/admin`
- `/circuits`
- `/tutor`
- `/simulations`
- `/lessons`
- `/health`

### Authentication

The authentication implementation supports:

- email and password registration
- email and password login
- bcrypt password hashing
- short-lived access JWTs
- seven-day refresh JWTs
- refresh-token hashing and database storage
- refresh-token rotation
- optional Google OAuth
- role checks for administrative routes

Protected routes use the JWT authentication middleware. Administrative routes require `admin` or `org_admin` roles.

### Database

The Prisma schema contains models for:

- users and roles
- user tiers and monthly simulation usage
- organizations and organization members
- course modules
- lesson progress
- tutor conversations
- subscription events
- refresh tokens
- saved circuits

Circuit operations are stored as JSON associated with the circuit owner.

### Circuit API

Authenticated users can:

- list their saved circuits
- create circuits
- retrieve a circuit by ID
- update a circuit
- delete a circuit

Circuit validation supports the gates represented in the API schema: `H`, `X`, `Y`, `Z`, `CNOT`, and `Measure`.

### Simulation API

The Node API validates simulation requests and forwards them to the Python simulator. It supports these circuit representations in the API contract:

- `qasm2`
- `json_ast`
- `qiskit_code`

The configured backend is `qiskit_aer`. The API applies tier limits before forwarding the request and increments the user's simulation usage after a successful simulation response.

### Tutor API

The tutor backend supports:

- conversation listing
- conversation creation
- chat requests
- optional circuit context in a chat request
- conversation persistence
- course-module context retrieval
- circuit warning detection

When an Anthropic API key is configured, the service can call Claude. Without that key, it uses the implemented keyword-based canned-reply path.

The circuit checks include:

- missing Measure gates after circuit logic
- CNOT control and target using the same qubit
- qubit indices outside the circuit range

### Billing and Usage

The implemented tiers are Free and Pro.

- Free: 50 simulations per month and a maximum of 1024 shots.
- Pro: configured for high simulation capacity and a maximum of 65536 shots.

The API integrates with Stripe Checkout, the Stripe billing portal, and webhook processing. Stripe subscription events update the stored user tier and are logged in the database.

### Health and Admin APIs

The health endpoint checks PostgreSQL connectivity and reports `ok` or `degraded`.

The admin API exposes:

- total users
- total circuits
- total conversations
- total organizations
- aggregated simulation usage
- a list of users

## 5. Simulator Implementation

The simulator is a FastAPI application in `apps/simulator`.

It uses:

- Qiskit
- Qiskit Aer
- NumPy
- optional Redis

The simulator can parse:

- OpenQASM 2
- the QVANTA JSON circuit AST
- a restricted Qiskit Python-code format

The JSON circuit format contains the number of qubits and a list of operations. The supported JSON gates are `H`, `X`, `Y`, `Z`, `CNOT`, and `Measure`.

The service validates qubit indices, CNOT targets, gate names, and supported angle expressions. It returns simulation results including measurement counts and circuit-related result data when available.

When Redis is available, the simulator queue stores job state for a limited period and publishes simulation jobs. The FastAPI application also supports inline operation when Redis is unavailable.

## 6. Frontend Implementation

### Routes

The React application defines these routes:

- `/`: public homepage
- `/login`: login page
- `/register`: registration page
- `/auth/google/callback`: Google OAuth completion page
- `/dashboard`: protected dashboard
- `/circuit/:id?`: protected circuit builder
- `/tutor`: protected AI tutor
- `/billing`: protected billing page
- `/admin`: protected admin page

Unauthenticated users are redirected to `/login` for protected routes.

### Authentication State

The frontend uses Zustand to store:

- the current user
- access token
- refresh token
- authentication status

The Axios API client adds the access token to requests. When an API response returns HTTP 401, it attempts to refresh the access token and retries the original request.

### Dashboard

The dashboard loads the current user, lessons, and public billing tiers. It displays:

- current account tier
- monthly simulation usage
- Free-tier usage limit
- upgrade action for Pro
- quick actions for circuit building, tutor chat, and billing
- lesson modules and progress status

### Circuit Builder

The circuit builder uses Zustand for circuit state. It manages:

- qubit count
- timestep count
- gate operations
- selected gate
- keyboard cursor position
- circuit reset and updates

The interface contains:

- a 3D circuit scene
- a Lite 2D fallback scene
- a Bloch visualization panel
- a Monaco editor
- simulation controls
- measurement result charts

The editor converts circuit state into Qiskit-style code. Code can be parsed back into circuit operations, and parse errors are shown as Monaco editor markers.

### Simulation Results

The frontend sends the circuit to `/simulations`, waits for the simulator response or job result, and displays measurement counts in a Recharts bar chart.

The result view shows:

- backend name
- shot count
- number of outcomes
- outcome labels
- measurement counts
- outcome percentages
- the most frequent outcome

The current frontend simulation request in `CodeEditorPanel.tsx` sends `format` and `circuit`, while the Express simulation route validates `circuit_repr` with `kind` and `value`. This is an existing integration mismatch in the codebase and means the frontend simulation flow requires alignment before it can reliably use the simulator API.

### AI Tutor Interface

The tutor interface provides:

- conversation selection
- new conversation handling
- prompt input
- optional current-circuit attachment
- displayed user and assistant messages
- lesson context labels when returned by the API
- speech synthesis integration when the tutor speech helper is available
- avatar preset selection

### Homepage

The homepage is composed of multiple animated React sections. It uses the homepage components and GSAP hook already present in `apps/web/src/components/homepage`.

## 7. End-to-End User Flow

1. The user opens the web application.
2. The user registers or logs in.
3. The frontend stores the returned authentication tokens.
4. The user opens the dashboard.
5. The dashboard loads user data, lessons, and tier information.
6. The user opens the circuit builder.
7. The user places gates in the 3D or Lite 2D view, or edits the Qiskit-style code.
8. The frontend converts the circuit into the API's JSON representation.
9. The Express API validates the request and checks usage limits.
10. The API forwards the request to the FastAPI simulator.
11. Qiskit Aer executes the circuit.
12. The frontend displays the returned measurement histogram.
13. The user can attach the current circuit to a tutor question.
14. The tutor service uses the circuit and available lesson context to create a response.
15. Conversations are stored for later retrieval.

## 8. Technology Stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- Zustand
- TanStack React Query
- Axios
- Tailwind CSS
- React Three Fiber
- Three.js
- Monaco Editor
- Recharts
- GSAP

### Backend

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- JWT
- bcrypt
- Passport Google OAuth
- Stripe
- Redis
- Zod
- Winston

### Simulator

- Python
- FastAPI
- Qiskit
- Qiskit Aer
- NumPy
- Redis client

## 9. Application Workflows

### 9.1 Local Registration and Login Workflow

1. The user opens `/register` or `/login` in the React application.
2. The frontend sends the email and password to `/auth/register` or `/auth/login`.
3. The Express API validates the request with Zod.
4. During registration, the password is hashed with bcrypt and a user is created in PostgreSQL through Prisma.
5. During login, the API compares the supplied password with the stored bcrypt hash.
6. The API issues an access token and refresh token.
7. The refresh token is also written as an HTTP-only cookie.
8. The frontend stores the returned authentication data through the Zustand auth store.
9. The user is redirected to `/dashboard`.

### 9.2 Access Token Refresh Workflow

1. The frontend API client adds the stored access token to outgoing requests.
2. If the API returns HTTP 401, the Axios response interceptor calls `/api/auth/refresh`.
3. The refresh token is sent from local storage or the refresh-token cookie.
4. The API verifies the refresh token and checks its hashed database record and expiry.
5. The old stored refresh token is deleted.
6. A new access and refresh token pair is issued and stored.
7. The original failed request is retried with the new access token.
8. If refresh fails, frontend authentication storage is cleared and the user is sent to `/login`.

### 9.3 Google OAuth Workflow

1. The frontend can start Google authentication through the backend Google route.
2. The Express API uses Passport Google OAuth when the required Google environment variables are configured.
3. The callback finds or creates the user using the Google profile ID and email.
4. The API issues tokens and redirects to the frontend callback route.
5. The frontend callback reads the access token, loads `/users/me`, stores the user and tokens, and redirects to `/dashboard`.

### 9.4 Dashboard Loading Workflow

1. The protected route checks the Zustand authentication state.
2. The dashboard requests `/users/me`, `/lessons`, and `/billing/tiers`.
3. The API loads the current user, course modules, progress status, and public tier definitions.
4. The frontend updates the user store and renders usage, tier, quick actions, and learning modules.
5. If the user is on the Free tier, the dashboard displays the simulation usage limit and Pro upgrade action.

### 9.5 Circuit Construction Workflow

1. The user opens `/circuit/:id?`.
2. The circuit store initializes a circuit with four qubits and eight timesteps when no circuit is loaded.
3. The user changes the qubit or timestep count through the circuit toolbar.
4. The user places gates using the 3D scene, Lite 2D scene, keyboard cursor, or code editor.
5. The circuit store validates the local dimensions and removes operations outside the updated dimensions.
6. The code editor generates Qiskit-style code from the current circuit state.
7. When code is applied or the editor loses focus, the frontend parses the code and updates the circuit store.
8. Invalid code produces Monaco editor markers and an error status.

### 9.6 Circuit Simulation Workflow

1. The user chooses a shot count and selects Simulate in the code editor.
2. The frontend reads the current circuit from the circuit store.
3. The frontend sends a request to `/simulations`.
4. The Express API authenticates the request and validates the simulation limits.
5. The API forwards the request to the FastAPI simulator at `SIMULATOR_URL` or `http://localhost:8000`.
6. The simulator parses the circuit representation and creates a Qiskit circuit.
7. Qiskit Aer executes the circuit and produces measurement results.
8. The API increments the user's simulation usage after a successful response.
9. The frontend renders the result as a Recharts measurement histogram.

The current implementation has a request-contract mismatch at step 3: the frontend sends `format` and `circuit`, while the Express API expects `circuit_repr` containing `kind` and `value`. This workflow is therefore documented as the intended implemented path, with the mismatch recorded as an existing integration issue.

### 9.7 Saved Circuit API Workflow

1. An authenticated client sends a circuit request to `/circuits`.
2. The API validates the circuit name, qubit count, timestep count, and operations.
3. Prisma creates or updates the circuit under the authenticated user's owner ID.
4. Circuit listing and retrieval only return circuits owned by that user.
5. Delete requests verify ownership before removing the circuit.

### 9.8 AI Tutor Workflow

1. The user opens `/tutor`.
2. The frontend requests saved conversations from `/tutor/conversations`.
3. The user selects an existing thread or starts a new conversation.
4. The user enters a question and can attach the current circuit context.
5. The frontend sends the question to `/tutor/chat`.
6. The API validates the prompt, conversation ID, and optional circuit structure.
7. The tutor service loads course modules and ranks relevant content using the implemented keyword matching path.
8. The tutor service checks the circuit for measurement, CNOT, and qubit-index issues.
9. If Anthropic is configured, the service sends the relevant context and recent conversation history to Claude.
10. Otherwise, the service generates the implemented keyword-based fallback response.
11. The response and conversation messages are stored in PostgreSQL.
12. The frontend displays the response and can trigger the available tutor speech integration.

### 9.9 Avatar Preset Workflow

1. The user opens the avatar customization control on the tutor page.
2. The user selects an avatar preset.
3. The frontend sends the selected numeric preset to `/users/me` with a PATCH request.
4. The API validates the preset range and updates the user record.
5. The frontend updates the stored user state and uses the selected preset in the tutor view.

### 9.10 Free-Tier Usage Workflow

1. A simulation request reaches the Express simulation route.
2. The API loads the latest tier and usage values from PostgreSQL.
3. If the stored usage month is different from the current month, the API resets the simulation count.
4. The API checks the Free-tier monthly simulation count and maximum shot count.
5. If a limit is exceeded, the API returns a payment-required or bad-request error.
6. If the simulation succeeds, the API increments the user's simulation count.

### 9.11 Pro Subscription Workflow

1. A Free-tier user selects the Pro upgrade action.
2. The frontend sends a request to `/billing/checkout` with the Pro tier.
3. The API creates a Stripe Checkout session using the configured price ID.
4. The user completes checkout on Stripe.
5. Stripe sends a webhook to `/billing/webhook`.
6. The API verifies the webhook signature using the configured webhook secret.
7. The API updates the user's Stripe customer ID and tier to Pro for successful subscription events.
8. Subscription events are stored in the `SubscriptionEvent` table.

### 9.12 Admin Monitoring Workflow

1. An authenticated user requests an admin route.
2. The JWT middleware validates the user token.
3. The role middleware allows only `admin` and `org_admin` users.
4. The API loads aggregate counts and recent user records from PostgreSQL.
5. The admin frontend displays the returned platform statistics and user information.

### 9.13 Health Check Workflow

1. A client requests `/health` on the Express API.
2. The API runs `SELECT 1` through Prisma.
3. If the database responds, the API returns HTTP 200 with database status `up`.
4. If the database check fails, the API returns HTTP 503 with overall status `degraded`.

### 9.14 Simulator Redis Workflow

1. The simulator attempts to connect to Redis during application startup.
2. If Redis is available, job state can be stored with an expiry and jobs can be published to the simulator channel.
3. If Redis is unavailable, the simulator reports offline mode and uses inline execution behavior.
4. Job lookup reads stored job data when Redis is enabled.

## 10. Demonstrable Features in the Existing Code

The codebase contains implementation for:

- local account registration and login
- optional Google OAuth configuration
- protected frontend routes
- saved circuit CRUD APIs
- interactive circuit editing
- 3D and 2D circuit views
- Qiskit-style code editing
- Qiskit Aer simulation requests
- measurement histogram display
- monthly simulation usage enforcement
- Stripe checkout and webhook handling
- lesson module retrieval
- persisted tutor conversations
- circuit-aware tutor requests
- optional Claude tutor mode
- admin statistics and user listing
- database health reporting

## 11. Current Scope Boundaries

The following points are stated from the implementation and configuration currently present:

- Claude tutor responses depend on the Anthropic API key; without it, the backend uses the implemented fallback response engine.
- Google login depends on Google OAuth configuration.
- Stripe operations depend on Stripe configuration and price IDs.
- Simulation requests depend on the FastAPI simulator being available at the configured URL.
- Redis is optional for simulator queue behavior; the simulator can run in offline inline mode.
- The frontend includes a local development authentication fallback for localhost.
- The API stores saved circuits, but the current circuit builder page contains a placeholder cleanup effect indicating that loading and saving by route ID is planned in that UI path.
- The frontend and API currently use different field names for the simulation request payload, as described in the Simulation Results section.

## 12. Conclusion

QVANTA is implemented as an integrated quantum education platform. Its main workflow connects interactive circuit construction, editable Qiskit-style code, Qiskit Aer execution, visual measurement results, course data, and circuit-aware tutoring in one authenticated web application.

The architecture is separated into a React frontend, an Express platform API, and a FastAPI quantum simulator, with PostgreSQL persistence and optional Redis, Stripe, Google OAuth, and Anthropic integrations.
