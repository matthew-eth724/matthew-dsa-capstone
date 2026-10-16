# Build 3 Architecture Documentation

## Layer Architecture

```mermaid
digraph G {
  rankdir=TB;
  node [shape=box, style=filled, fillcolor=lightblue];
  
  subgraph cluster_0 {
    label = "Presentation Layer";
    style=dashed;
    node [fillcolor=lightcoral];
    router [label="Router\n(src/http/router.js)"];
    app [label="HTTP Server\n(src/http/app.js)"];
  }
  
  subgraph cluster_1 {
    label = "Application Layer";
    style=dashed;
    node [fillcolor=lightgreen];
    server [label="Server\n(src/server.js)"];
    config [label="Config\n(src/config.js)"];
  }
  
  subgraph cluster_2 {
    label = "Domain Services";
    style=dashed;
    node [fillcolor=lightyellow];
    services [label="Services\n(defined in src/domain/)"];
  }
  
  subgraph cluster_3 {
    label = "Domain Rules & Repositories";
    style=dashed;
    node [fillcolor=lightpink];
    stateMachine [label="Booking State Machine\n(src/domain/bookingStateMachine.js)"];
    inventory [label="Inventory\n(src/domain/inventory.js)"];
    ids [label="IDs\n(src/domain/ids.js)"];
    errors [label="Errors\n(src/domain/errors.js)"];
  }
  
  subgraph cluster_4 {
    label = "Data Layer";
    style=dashed;
    node [fillcolor=lightcyan];
    database [label="Database\n(SQLite)"];
  }
  
  router -> app;
  app -> server;
  server -> services;
  services -> stateMachine;
  services -> inventory;
  services -> ids;
  services -> errors;
  inventory -> database;
  stateMachine -> inventory;
  
  // No upward calls
  app -> services [style=dashed, color=red];
  services -> stateMachine [style=dashed, color=red];
  stateMachine -> inventory [style=dashed, color=red];
  inventory -> database [style=dashed, color=red];
}
```

## Layer Responsibilities

### Presentation Layer (router, app)
**What it may do:**
- Receive HTTP requests from clients
- Parse HTTP methods and paths
- Extract route parameters
- Generate HTTP responses
- Handle HTTP errors and status codes
- Serve static files from public/

**What it may NOT do:**
- Perform business logic validation
- Access database or persistent storage
- Manipulate domain objects
- Implement authentication or authorization
- Process payment or transaction logic

### Application Layer (server, config)
**What it may do:**
- Start and configure the HTTP server
- Read environment variables and configuration
- Manage server lifecycle (start, stop, restart)
- Set up middleware and error handling
- Log server events and errors
- Validate incoming request structure

**What it may NOT do:**
- Access database directly
- Perform complex business rule validation
- Manipulate domain objects
- Handle user authentication
- Process payment transactions

### Domain Services (services)
**What it may do:**
- Orchestrate business operations across multiple domain modules
- Validate business rules and constraints
- Coordinate between different domain components
- Transform data between domain layers
- Handle business errors and exceptions

**What it may NOT do:**
- Access persistent storage directly
- Serve HTTP requests or responses
- Perform I/O operations outside domain logic
- Handle network communication

### Domain Rules & Repositories (stateMachine, inventory, ids, errors)
**What it may do:**
- Implement core business rules and validations
- Maintain domain state and consistency
- Provide data access abstraction
- Handle domain-specific errors
- Perform business logic operations

**What it may NOT do:**
- Accept HTTP requests
- Serve web pages
- Perform external API calls
- Handle system-level configuration

### Data Layer (database)
**What it may do:**
- Store and retrieve persistent data
- Maintain data integrity and consistency
- Perform database queries and transactions
- Provide data access services

**What it may NOT do:**
- Process business logic
- Handle application-level requests
- Perform data transformation outside domain rules
- Implement authentication or authorization

## Data Model

```mermaid
digraph G {
  rankdir=TB;
  node [shape=box, style=filled, fillcolor=lightblue];
  
  subgraph cluster_0 {
    label = "Events";
    style=dashed;
    event [label="Event\n(organizational data)"];
    tier [label="Ticket Tier\n(pricing, capacity, sold)"];
  }
  
  subgraph cluster_1 {
    label = "Bookings";
    style=dashed;
    booking [label="Booking\n(state, tickets, payment)"];
    waitlist [label="Waitlist\n(queued attendees)"];
  }
  
  subgraph cluster_2 {
    label = "Users";
    style=dashed;
    user [label="User\n(attendees, organizers, staff)"];
  }
  
  subgraph cluster_3 {
    label = "Relationships";
    style=dashed;
    node [shape=plaintext];
    rel1 [label="1:N Events → Ticket Tiers"];
    rel2 [label="1:N Events → Bookings"];
    rel3 [label="1:N Users → Bookings"];
    rel4 [label="1:N Events → Users (staff assignments)"];
    rel5 [label="1:N Ticket Tier → Waitlists"];
  }
  
  event -> tier;
  event -> booking;
  user -> booking;
  user -> rel4;
  tier -> waitlist;
}
```

## Booking Life Cycle

```mermaid
digraph G {
  rankdir=TB;
  node [shape=box, style=filled, fillcolor=lightblue];
  
  // States
  pending [label="Pending\n(initial state)", fillcolor=yellow];
  paid [label="Paid\n(after payment)", fillcolor=lightgreen];
  checked_in [label="Checked In\n(at venue)", fillcolor=lightgreen];
  cancelled [label="Cancelled\n(user cancellation)", fillcolor=lightcoral];
  refunded [label="Refunded\n(after cancellation/refund)", fillcolor=lightcoral];
  
  // Transitions
  pending -> paid;
  pending -> cancelled;
  paid -> checked_in;
  paid -> refunded;
  paid -> cancelled;
  
  // Note: cancelled, refunded, checked_in are final states
  
  // Group final states
  subgraph cluster_final {
    label = "Final States";
    style=dashed;
    cancelled;
    refunded;
    checked_in;
  }
  
  // Annotate transitions
  pending -> paid [label="payment successful"];
  pending -> cancelled [label="user cancels"];
  paid -> checked_in [label="scanned at door"];
  paid -> refunded [label="refund policy applies"];
  paid -> cancelled [label="user cancels after payment"];
}
```

## Layer Summary

| Layer | Responsibilities | Restrictions |
|-------|------------------|--------------|
| **Presentation** | Handle HTTP requests/responses, route matching, serve static files | No business logic, no direct data access |
| **Application** | Configure server, manage lifecycle, request validation | No direct database access, no business rules |
| **Domain Services** | Orchestrate business operations, coordinate domain components | No HTTP handling, no external I/O |
| **Domain Rules** | Implement business rules, manage domain state, provide data access | No HTTP handling, no system configuration |
| **Data Layer** | Store/retrieve persistent data, maintain data integrity | No business logic, no application requests |

This architecture ensures clear separation of concerns, with data flowing one-way from presentation to data storage, and strict control over layer interactions to maintain system integrity and testability.