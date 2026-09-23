# Software Engineering Glossary for NearHere

This glossary gives framework-independent definitions first, followed by the NearHere example. Terms are intentionally repeated in the other documents after they have been introduced here.

## Core software terms

**Application (app):** software built to help a user complete tasks. NearHere is a mobile application installed on iOS or Android.

**Client:** software that requests data or actions from another system. The NearHere mobile app is currently a client of Supabase Auth and the Supabase Data API/RPC surface; it can later call the dedicated NearHere HTTP API without changing its product-domain vocabulary.

**Server:** trusted software that receives requests, applies rules, and returns responses. Today Supabase Auth, PostgREST, and PostgreSQL functions perform server responsibilities for NearHere. A future NearHere application-server process will centralize increasingly complex participation, safety, and operational behavior.

**Runtime:** the environment that executes code. TypeScript is converted to JavaScript; a JavaScript runtime inside React Native executes it, while native iOS/Android runtimes render platform controls.

**State:** information that can change over time and affects behavior or rendering. The selected activity, authentication status, and current map coordinate are state.

**API (Application Programming Interface):** a defined contract by which software systems communicate. `POST /v1/activities/:id/join` will be an API operation with a known request, response, and failure behavior.

**Data API:** Supabase's generic HTTPS interface over permitted PostgreSQL schemas, tables, views, and functions. It translates client requests into database operations while preserving Postgres grants and RLS checks. It is different from NearHere's domain-specific application API.

**Read model/projection:** a purpose-specific result assembled for one read use case rather than a direct copy of a stored table. `my_plans` combines memberships, activities, host profiles, counts, and conditionally private geometry into one caller-safe response.

**Caller-scoped:** filtered and authorized using the identity derived from the verified request/session, not a user ID claimed by the client. `my_plans` uses `auth.uid()` and never accepts `userId` as an input.

**RPC (Remote Procedure Call):** asking another process to execute a named operation with parameters. `supabase.rpc('nearby_activities', ...)` sends an HTTPS request through the Data API to a PostgreSQL function; it is remote despite looking like a local TypeScript function call.

**Endpoint:** one address and operation within an API. A method plus path, such as `GET /v1/activities/nearby`, identifies an HTTP endpoint.

**Contract:** an agreed data shape and behavior at a boundary. A TypeScript type helps developers at compile time; runtime validation and server behavior uphold the contract while running.

**Runtime validation:** checking actual data while the program runs, because TypeScript types disappear when code becomes JavaScript and cannot prove that network JSON is trustworthy. NearHere's Plans parser checks every row's enums, timestamps, counts, coordinates, and accepted-plus-active private-location rule before the UI receives a `MyPlanSummary`.

**Stale-response race:** when an older asynchronous request finishes after a newer request and incorrectly overwrites newer state. NearHere's Plans hook tags requests and discards responses whose request ID is no longer current.

**Cross-account cache bleed:** briefly or persistently showing data authorized for one account after the active account changes. NearHere's Plans snapshot is keyed by user ID and synchronously withheld when the current session identity does not match.

**Module:** a cohesive unit with a narrow responsibility and public interface. Activities and memberships can be separate modules inside one API deployment.

**Dependency:** code or a service another component requires. `expo-location` is a code dependency; Supabase is an external service dependency.

**Framework:** a reusable structure that calls application code according to its lifecycle and conventions. Expo Router maps files to navigation routes.

## Network and backend terms

**HTTP:** the request/response protocol normally used between mobile clients and web APIs.

**JSON:** a text representation for values, arrays, and objects commonly used in HTTP bodies.

**Authentication:** proving who a user is. NearHere uses a phone number and SMS one-time password.

**Authorization:** deciding what an authenticated or anonymous actor may do. A valid session does not automatically authorize editing someone else's activity.

**Session:** server-issued identity state, usually represented by short-lived access and longer-lived refresh tokens on the client.

**JWT (JSON Web Token):** a signed token containing claims, such as a user identifier and expiration. A valid signature prevents undetected modification; it does not encrypt the claims.

**Cache:** a faster temporary copy of data whose authoritative version exists elsewhere. A place-search result can be cached; membership capacity must remain correct in PostgreSQL.

**Rate limit:** a rule restricting operations per actor or period to protect reliability, cost, and abuse boundaries.

**WebSocket:** a persistent two-way network connection. It can deliver chat and participant-count events without repeated polling, but it is not required for NearHere's current slice.

**Idempotency:** a property that makes retrying the same logical operation safe. NearHere's current Join is idempotent through the unique `(activity_id, user_id)` membership identity and by returning an existing active status. Future commands may need explicit client-generated idempotency keys plus stored request fingerprints/responses.

## Data terms

**Database:** a system that durably stores and retrieves structured information. NearHere uses PostgreSQL.

**Database connection:** a session using PostgreSQL's native protocol and credentials. A mobile app should not receive a privileged database password; it uses HTTPS APIs instead.

**Relational database:** a database organizing data into tables connected by keys and protected by constraints.

**Schema:** the formal shape of database objects: tables, columns, types, constraints, indexes, policies, and functions.

**PostgreSQL schema namespace:** a named container for database objects, such as `public.profiles`. The `public` name does not imply anonymous access.

**Database role:** an identity inside PostgreSQL to which privileges can be granted. Supabase Data API requests commonly run as `anon`, `authenticated`, or the privileged `service_role`.

**Grant/privilege:** permission for a database role to perform an operation on an object, such as `SELECT` on a table or `EXECUTE` on a function.

**Exposed schema/table:** an object reachable through the configured Data API surface and role privileges. Reachability still does not guarantee row access because RLS policies are evaluated separately.

**Migration:** a versioned, reviewable change that moves a database schema from one known state to another.

**Primary key:** the stable unique identity of a row. NearHere uses UUIDs for user and activity identity.

**Foreign key:** a constraint requiring one row to reference an existing row in another table.

**Index:** an auxiliary data structure that speeds selected queries in exchange for storage and write cost.

**Transaction:** a group of database operations that succeeds or fails as one unit. Claiming the last activity place requires a transaction.

**Row lock:** temporary transaction ownership of a database row that forces conflicting operations to wait. `join_activity` locks one activity row before counting accepted memberships, serializing capacity decisions for that activity while allowing joins to other activities to proceed.

**Database function:** named logic executed inside PostgreSQL. NearHere's `create_activity` function validates the actor, creates public and private location records plus the host membership, and rolls the whole transaction back if one step fails.

**Security definer:** a PostgreSQL function mode that executes with the function owner's privileges instead of the caller's. It is powerful and therefore requires a narrow signature, fixed `search_path`, schema-qualified objects, explicit return columns, input/actor checks, and minimal `EXECUTE` grants.

**Invariant:** a rule that must always remain true. An accepted membership count cannot exceed activity capacity.

**PostGIS:** a PostgreSQL extension that adds geographic types, indexes, and distance operations.

**GiST index:** a generalized search-tree index used by PostGIS to narrow spatial candidates for predicates such as “within this radius.” It can avoid calculating distance against every activity, but its real benefit must be verified with representative rows and a query plan.

**Row Level Security (RLS):** database policies automatically restricting which rows a request may read or change. It is defense in depth, especially when clients use Supabase's data API.

**RLS policy:** a rule attached to a table and operation. `USING` controls which existing rows may be targeted; `WITH CHECK` controls which inserted/updated row values are allowed.

## Architecture and operations terms

**System of record:** the authoritative durable source for a fact. PostgreSQL, not Redis or the mobile UI, is the system of record for memberships.

**Trust boundary:** a point where data or control moves between components with different security assumptions. Every request from the user-controlled mobile client crosses a trust boundary.

**Modular monolith:** one deployable backend divided into strongly separated business modules. It avoids premature distributed-system complexity while preserving maintainable boundaries.

**Scalability:** the ability to handle increased users, data, or traffic while meeting requirements. It is not synonymous with microservices.

**Latency:** time required to complete an operation. Nearby discovery latency is measured from request start to usable response.

**Throughput:** operations completed per unit time, such as nearby queries per second.

**Availability:** the proportion of time a service can successfully respond.

**Durability:** the probability that acknowledged data remains stored despite failures.

**Observability:** evidence—logs, metrics, traces, and alerts—that helps engineers understand a running system.

**Vertical slice:** one user-visible capability implemented through every layer it needs. Manual location crossed UI, state, platform permissions, storage, validation, navigation, and testing.

**Horizontal scaling:** adding more service instances. **Vertical scaling:** giving one instance more CPU, memory, or storage.

**Graceful degradation:** preserving a reduced but honest capability when a dependency fails. If place search fails, manual pin movement still works.
