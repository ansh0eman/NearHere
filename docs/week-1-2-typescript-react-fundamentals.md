# Week 1–2: TypeScript and React Fundamentals

This guide starts from zero and builds the concepts needed to read NearHere.
It is deliberately progressive: learn a small language concept, see a small
example, then connect it to one real project file.

The goal is not to memorize syntax. The goal is to understand this chain:

```text
data → types → functions → components → state → user interaction → network result
```

Use one lesson at a time. For every example:

1. Predict what it does.
2. Trace the values by hand.
3. Change one small thing.
4. Explain the result in your own words.

---

# Part I — JavaScript foundations

TypeScript is JavaScript with a static type system. React uses JavaScript or
TypeScript to describe user interfaces. We therefore begin with the smallest
JavaScript foundation.

## 1. Values and variables

A value is a piece of data:

```ts
'Coffee'       // string
42             // number
true           // boolean
null           // intentionally empty
undefined      // not provided yet
```

A variable gives a value a name:

```ts
const title = 'Morning Coffee';
let participantCount = 3;

participantCount = 4;
```

Use `const` when the variable binding should not be reassigned. Use `let`
when the binding must change. Prefer `const` by default.

```ts
const activityName = 'Morning Walk';
// activityName = 'Coffee'; // error

let status = 'loading';
status = 'ready';
```

`const` prevents reassignment of the variable. It does not make an object
deeply immutable; React state still needs careful immutable updates.

## 2. Primitive types

TypeScript names common primitive types:

```ts
const activityTitle: string = 'Morning Walk';
const capacity: number = 10;
const isPublished: boolean = true;
const noMeetingPoint: null = null;
```

Often TypeScript can infer the type:

```ts
const activityTitle = 'Morning Walk'; // string
const capacity = 10;                  // number
```

Explicit annotations are most useful at important boundaries:

```ts
let selectedActivityId: string | null = null;
```

This means the value is either a string or `null`. It is a common UI state:
initially nothing is selected, then an activity ID is selected.

## 3. Operators and conditions

```ts
const accepted = 4;
const capacity = 5;
const hasSpace = accepted < capacity; // true

const status = 'pending';
const canShowChat = status === 'accepted'; // false
```

Use strict equality (`===`) rather than loose equality (`==`).

Logical operators combine conditions:

```ts
const isAuthenticated = true;
const profileComplete = false;

const canHost = isAuthenticated && profileComplete;
const needsOnboarding = isAuthenticated && !profileComplete;
```

## 4. Functions

A function is reusable behavior. It can receive parameters and return a value.

```ts
function formatDistance(distanceM: number): string {
  if (distanceM < 1000) {
    return `${Math.round(distanceM)} m away`;
  }

  return `${(distanceM / 1000).toFixed(1)} km away`;
}

const label = formatDistance(850); // '850 m away'
```

Read a function as a contract:

```text
name:   formatDistance
input:  distanceM, a number
output: a string
logic:  choose meters or kilometers
```

An arrow function is another function syntax:

```ts
const add = (first: number, second: number): number => {
  return first + second;
};

const double = (value: number): number => value * 2;
```

## 5. Objects

An object groups related properties:

```ts
const activity = {
  id: 'activity-1',
  title: 'Morning Walk',
  participantCount: 3,
  capacity: 8,
};

activity.title;            // 'Morning Walk'
activity.participantCount; // 3
```

Destructuring extracts properties:

```ts
const { title, capacity } = activity;
```

React components commonly destructure their props:

```tsx
function ActivityTitle({ title }: { title: string }) {
  return <Text>{title}</Text>;
}
```

## 6. Arrays

An array is an ordered collection:

```ts
const activityTypes = ['walk', 'coffee', 'sports'];
const firstType = activityTypes[0]; // 'walk'
```

Important methods:

```ts
const numbers = [1, 2, 3, 4];

const doubled = numbers.map((number) => number * 2);
// [2, 4, 6, 8]

const even = numbers.filter((number) => number % 2 === 0);
// [2, 4]

const found = numbers.find((number) => number === 3);
// 3
```

- `map` transforms every item.
- `filter` keeps matching items.
- `find` returns the first match or `undefined`.

React uses `map` to render lists:

```tsx
{activities.map((activity) => (
  <Text key={activity.id}>{activity.title}</Text>
))}
```

The `key` gives React a stable identity for each rendered item.

## 7. Immutability and copying

Do not modify React state in place.

Avoid:

```ts
activities.push(newActivity);
```

Prefer a new array:

```ts
const nextActivities = [...activities, newActivity];
```

For objects:

```ts
const updatedActivity = {
  ...activity,
  participantCount: activity.participantCount + 1,
};
```

React can detect a new array or object reference. In-place mutation can leave
the UI stale and makes changes harder to reason about.

---

# Part II — TypeScript fundamentals

## 8. Object types and interfaces

A type alias describes an object contract:

```ts
type ActivitySummary = {
  id: string;
  title: string;
  participantCount: number;
  capacity: number;
};
```

Use it to check data:

```ts
const activity: ActivitySummary = {
  id: 'activity-1',
  title: 'Morning Walk',
  participantCount: 3,
  capacity: 8,
};
```

An interface can express a similar contract:

```ts
interface UserProfile {
  id: string;
  displayName: string;
}
```

The important engineering idea is shared vocabulary. A screen, hook, and
repository should agree on what an activity or profile contains.

## 9. Optional and nullable properties

An optional property may be absent:

```ts
type Profile = {
  id: string;
  displayName?: string;
};
```

A nullable property exists but may contain `null`:

```ts
type Activity = {
  id: string;
  description: string | null;
};
```

Remember:

```text
optional: property might not exist
nullable: property exists but can be null
```

## 10. Union types

A union allows a fixed set of alternatives:

```ts
type ActivityStatus = 'published' | 'cancelled' | 'completed';

let status: ActivityStatus = 'published';
// status = 'draft'; // error
```

Unions are especially useful for UI state machines:

```ts
type LoadingState =
  | { status: 'loading' }
  | { status: 'ready'; activities: ActivitySummary[] }
  | { status: 'error'; message: string };
```

This is safer than unrelated variables that can contradict each other:

```ts
let isLoading = false;
let errorMessage = 'Failed';
let activities: ActivitySummary[] = [];
```

With a union, each state carries only the data valid for that state.

## 11. Narrowing a union

Check the discriminator before reading branch-specific data:

```ts
function describe(state: LoadingState): string {
  if (state.status === 'loading') {
    return 'Loading...';
  }

  if (state.status === 'error') {
    return state.message;
  }

  return `${state.activities.length} activities`;
}
```

When TypeScript sees `status === 'error'`, it knows `message` exists. This
is called discriminated-union narrowing.

## 12. Unknown network data

Data from a database, network, or local storage is external data. Treat it as
`unknown` until it is validated:

```ts
function readTitle(value: unknown): string {
  if (
    typeof value === 'object' &&
    value !== null &&
    'title' in value &&
    typeof value.title === 'string'
  ) {
    return value.title;
  }

  throw new Error('Invalid activity response');
}
```

Do not use `any` just to silence a type error. `any` disables much of
TypeScript's protection.

The safety chain is:

```text
unknown response
    ↓
runtime validation
    ↓
typed domain object
    ↓
React UI
```

NearHere uses runtime parsers at this boundary.

## 13. Null safety

With strict TypeScript, this is unsafe:

```ts
const selected: ActivitySummary | null = null;
// selected.title; // error: selected may be null
```

Check first:

```ts
if (selected) {
  console.log(selected.title);
}
```

Optional chaining safely stops when a value is absent:

```ts
const title = selected?.title;
```

Nullish coalescing supplies a fallback only for `null` or `undefined`:

```ts
const displayTitle = selected?.title ?? 'Choose an activity';
```

## 14. Async functions and promises

Network work takes time. An async function returns a Promise:

```ts
async function loadActivities(): Promise<ActivitySummary[]> {
  const response = await fetch('/activities');
  return response.json();
}
```

`await` pauses this function until the promise settles; it does not freeze
the entire app.

Handle success and failure:

```ts
try {
  const activities = await loadActivities();
  console.log(activities);
} catch (error) {
  console.error(error);
}
```

The async UI state is usually:

```text
not started / loading → success
                       ↘ failure
```

## 15. Result objects

A result object makes success and failure explicit:

```ts
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };
```

Use it safely:

```ts
const result = await loadActivitiesSafely();

if (!result.ok) {
  return result.message;
}

return result.value;
```

NearHere uses this style so repositories can return deliberate user-facing
messages rather than exposing raw database errors.

## 16. Generics

A generic preserves the type relationship between input and output:

```ts
function first<T>(items: T[]): T | undefined {
  return items[0];
}

const firstNumber = first([1, 2, 3]);         // number | undefined
const firstTitle = first(['Walk', 'Coffee']); // string | undefined
```

You do not need advanced generics immediately. Recognize `<T>` as “the caller
supplies a type, and this function preserves it.”


---

# Part III — React fundamentals

React describes a user interface as a function of data:

```text
current props + current state
          ↓
       component
          ↓
      rendered UI
```

When state changes, React runs the component again and updates the necessary
parts of the screen.

## 17. Components

A component is a function that returns UI:

```tsx
function Greeting() {
  return <Text>Hello from NearHere</Text>;
}
```

In React Native, `Text`, `View`, `Pressable`, `ScrollView`, and
`TextInput` are native UI components. JSX looks like HTML, but it becomes
native iOS and Android views.

Components compose other components:

```tsx
function App() {
  return (
    <View>
      <Greeting />
      <Text>Find something nearby.</Text>
    </View>
  );
}
```

Uppercase JSX names refer to your components. Built-in React Native elements
such as `View` and `Text` are also uppercase because they are imported
components.

## 18. JSX

JSX lets you insert JavaScript expressions inside braces:

```tsx
function ActivityTitle({ title }: { title: string }) {
  return <Text>{title}</Text>;
}
```

Compute complicated values before the return:

```tsx
const label = count === 1 ? '1 person' : `${count} people`;

return <Text>{label}</Text>;
```

A component must return one JSX tree. Use a wrapper such as `View` or a
fragment when necessary.

## 19. Props

Props are inputs passed from a parent to a child:

```tsx
type ActivityCardProps = {
  title: string;
  distanceM: number;
  onPress: () => void;
};

function ActivityCard({ title, distanceM, onPress }: ActivityCardProps) {
  return (
    <Pressable onPress={onPress}>
      <Text>{title}</Text>
      <Text>{Math.round(distanceM)} m away</Text>
    </Pressable>
  );
}
```

The parent supplies data and behavior:

```tsx
<ActivityCard
  title="Morning Walk"
  distanceM={850}
  onPress={() => console.log('selected')}
/>
```

Props flow downward:

```text
parent data and callback
          ↓
        child
          ↓
    user interaction
```

The child does not secretly modify the parent's data. It calls the supplied
callback.

## 20. State

State is data that changes during a component's lifetime:

```tsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <View>
      <Text>{count}</Text>
      <Button title="Add" onPress={() => setCount(count + 1)} />
    </View>
  );
}
```

The two values are:

```text
count       current state value
setCount    function that requests an update
```

Never assign directly to state. Use the setter:

```ts
setCount((current) => current + 1);
```

The functional form is safest when the next value depends on the previous value.

## 21. State with objects and arrays

```tsx
type FormState = {
  title: string;
  capacity: number;
};

const [form, setForm] = useState<FormState>({
  title: '',
  capacity: 4,
});

setForm((current) => ({
  ...current,
  title: 'Morning Walk',
}));
```

For arrays:

```tsx
setActivities((current) => [newActivity, ...current]);
```

The spread operator keeps the existing data and creates a new reference.

## 22. Conditional rendering

UI branches on state:

```tsx
if (state.status === 'loading') {
  return <ActivityIndicator />;
}

if (state.status === 'error') {
  return <Text>{state.message}</Text>;
}

return <ActivityList activities={state.activities} />;
```

A short branch can be inline:

```tsx
{isAuthenticated ? <PlansButton /> : <SignInButton />}
```

Prefer early returns or named variables when conditions become complicated.

## 23. Events and async actions

An event is something the user or platform does:

```tsx
<Pressable onPress={handleJoin}>
  <Text>Join</Text>
</Pressable>
```

The handler may call an asynchronous repository operation:

```tsx
async function handleJoin() {
  setJoining(true);

  try {
    const result = await joinActivity(activityId);
    // update or navigate based on result
  } finally {
    setJoining(false);
  }
}
```

The UI should prevent duplicate actions while a request is in progress.

## 24. useEffect

`useEffect` synchronizes React with an external system:

```text
network requests
subscriptions
timers
device APIs
logging
```

Example:

```tsx
useEffect(() => {
  void refreshActivities();
}, [refreshActivities]);
```

The dependency array says which values the effect uses. When a dependency
changes, React may run the effect again.

Effects can return cleanup:

```tsx
useEffect(() => {
  const subscription = subscribeToMessages(onMessage);

  return () => {
    subscription.unsubscribe();
  };
}, [onMessage]);
```

Without cleanup, subscriptions and timers can continue after a screen disappears.

Do not use an effect for ordinary calculations:

```tsx
// unnecessary
useEffect(() => {
  setLabel(`${count} people`);
}, [count]);
```

Prefer:

```tsx
const label = `${count} people`;
```

## 25. useMemo

`useMemo` remembers the result of a calculation:

```tsx
const activityFeatures = useMemo(
  () => buildActivityMapFeatures(activities),
  [activities],
);
```

It recalculates when `activities` changes. Use it when a calculation is
expensive or a stable reference matters. Do not add it automatically.

## 26. useCallback

`useCallback` remembers a function reference:

```tsx
const refresh = useCallback(async () => {
  await loadActivities(latitude, longitude);
}, [latitude, longitude]);
```

It is useful when a function is passed to a child or used as an effect
dependency. Every value read by the callback belongs in its dependency list.

## 27. useRef

`useRef` stores a mutable value between renders without causing a render when
it changes:

```tsx
const requestId = useRef(0);

async function refresh() {
  const activeRequest = ++requestId.current;
  const result = await loadActivities();

  if (activeRequest !== requestId.current) {
    return; // an older request finished late
  }

  setState(result);
}
```

NearHere uses this kind of request ID to ignore stale network responses.

Other uses include:

```text
holding a native map reference
remembering whether a screen focused once
preventing duplicate submissions
```

## 28. Component lifecycle

A simplified lifecycle is:

```text
component function runs
        ↓
React commits the UI
        ↓
effects run
        ↓
state or props change
        ↓
component function runs again
        ↓
React updates changed UI
```

Therefore:

- Do not start side effects directly during rendering.
- Do not assume local variables persist between renders.
- Use state for values that should trigger rendering.
- Use refs for persistent mutable values that should not trigger rendering.
- Use effects to synchronize external systems.

## 29. Controlled inputs

In a controlled input, React state is the source of truth:

```tsx
const [title, setTitle] = useState('');

<TextInput
  value={title}
  onChangeText={setTitle}
  placeholder="Activity title"
/>
```

The flow is:

```text
user types
    ↓
onChangeText receives new text
    ↓
setTitle updates state
    ↓
component renders again
    ↓
TextInput receives the new value
```

This makes validation and submission predictable.

## 30. Lists and keys

```tsx
<ScrollView>
  {activities.map((activity) => (
    <ActivityCard
      key={activity.id}
      title={activity.title}
      distanceM={activity.distanceM}
      onPress={() => selectActivity(activity.id)}
    />
  ))}
</ScrollView>
```

Keys must be stable identifiers. Avoid array indexes when rows can be inserted,
removed, or reordered.

## 31. Expo Router

NearHere uses file-based routing:

```text
apps/mobile/app/_layout.tsx          root stack
apps/mobile/app/(tabs)/index.tsx     Nearby tab
apps/mobile/app/activity/[id].tsx    dynamic activity detail
apps/mobile/app/auth/phone.tsx       phone authentication
```

The file path becomes part of navigation. `[id]` means the route expects a
dynamic activity identifier.

The root layout also wraps the application with providers and declares stacks,
tabs, modals, and dynamic routes.

---

# Part IV — Reading one real NearHere flow

Do not try to understand the whole repository at once. Trace one vertical
slice: loading nearby activities.

```text
NearbyScreen
    ↓ passes latitude, longitude, filter
useNearbyActivities
    ↓ manages loading and request ordering
getNearbyActivities
    ↓ calls Supabase RPC
nearby_activities_with_avatars
    ↓ queries PostgreSQL/PostGIS
parseNearbyActivityRows
    ↓ validates unknown JSON
NearbyActivitiesState
    ↓
map and activity cards render
```

## 32. The screen

The Nearby screen owns user-facing coordination:

```text
selected activity
selected filter
joining state
map status
navigation
```

It should not contain every SQL or parsing detail.

File:

[Nearby screen](/Users/ansh0eman/Desktop/NearHere/apps/mobile/app/(tabs)/index.tsx)

## 33. The hook

The hook owns the request lifecycle:

```text
start request → loading
success       → ready
failure       → error
```

File:

[Nearby activities hook](/Users/ansh0eman/Desktop/NearHere/apps/mobile/hooks/use-nearby-activities.ts)

It also tracks request ordering so an older response cannot overwrite a newer
one.

## 34. The repository

The repository translates application input into a backend request:

```ts
supabase.rpc('nearby_activities_with_avatars', {
  p_latitude: query.latitude,
  p_longitude: query.longitude,
  p_radius_m: query.radiusM,
  p_kinds: query.kinds,
  p_limit: query.limit ?? 50,
});
```

File:

[Activity repository](/Users/ansh0eman/Desktop/NearHere/apps/mobile/lib/activity-repository.ts)

It then translates the external response into a typed domain result.

## 35. The database

PostgreSQL and PostGIS perform the trusted search. The database decides which
activities are published, within the requested radius, and safe for public
discovery.

The UI displays the result; it does not independently decide which database
rows should be returned.

## 36. A complete small component

This combines props, state, events, conditional rendering, and async behavior:

```tsx
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

type JoinButtonProps = {
  activityId: string;
  onJoin: (activityId: string) => Promise<boolean>;
};

export function JoinButton({ activityId, onJoin }: JoinButtonProps) {
  const [status, setStatus] = useState<'idle' | 'joining' | 'failed'>('idle');

  async function handlePress() {
    if (status === 'joining') return;

    setStatus('joining');
    const succeeded = await onJoin(activityId);
    setStatus(succeeded ? 'idle' : 'failed');
  }

  const label =
    status === 'joining'
      ? 'Joining...'
      : status === 'failed'
        ? 'Try again'
        : 'Join';

  return (
    <Pressable onPress={handlePress} disabled={status === 'joining'}>
      <Text>{label}</Text>
    </Pressable>
  );
}
```

Read it in this order:

1. `JoinButtonProps` defines the input contract.
2. `useState` stores local button state.
3. `handlePress` prevents duplicate requests.
4. `onJoin` is supplied by the parent and performs the real operation.
5. `label` converts internal state into visible text.
6. JSX renders the result.

The button does not decide whether the user is truly authorized to join. It
starts the operation and reflects its current state.


---

# Part V — Common mistakes

## Mistake 1: “TypeScript validates the database response”

It does not. Types are removed when the application runs. A server can still
return malformed JSON. Use runtime validation at network and storage
boundaries.

## Mistake 2: “A component runs once”

It does not. A component can run many times when props or state change. Keep
side effects in event handlers or effects, not directly in rendering.

## Mistake 3: “The screen should do everything”

Large screens become difficult to test and understand. Separate:

```text
UI composition
state lifecycle
network transport
runtime parsing
backend rules
```

## Mistake 4: “Loading is just a spinner”

Loading is one state. A trustworthy screen also plans for:

```text
loading
ready
empty
stale data
error
retry
signed out
permission denied
```

## Mistake 5: “Disabling a button provides security”

Disabling a button improves experience. It does not authorize an operation. The
trusted backend must enforce authorization.

## Mistake 6: “More hooks are automatically better”

Hooks are tools, not decorations. Use them when they own state, lifecycle, or
synchronization. Do not add an effect for a value that can be calculated during
rendering.

---

# Part VI — Two-week study plan

## Week 1: TypeScript and JavaScript

### Session 1 — Values and functions

Learn:

- values and variables
- `const` and `let`
- strings, numbers, booleans, `null`, and `undefined`
- functions and return values

Exercise: write `formatDistance` and `formatParticipantCount`.

### Session 2 — Objects and arrays

Learn:

- object properties
- arrays
- `map`, `filter`, and `find`
- object spread and array spread
- immutable updates

Exercise: transform an array of activity objects without mutating it.

### Session 3 — Types and states

Learn:

- type annotations
- type aliases and interfaces
- optional and nullable properties
- union types

Exercise: create a `NearbyActivitiesState` union with loading, ready, empty,
and error states.

### Session 4 — External data and async work

Learn:

- narrowing
- `unknown`
- runtime validation
- promises
- `async` and `await`
- `try/catch`
- result objects

Exercise: validate an unknown activity response before reading its title.

### Session 5 — Read real NearHere TypeScript

Read only small pieces of:

- [activity types](/Users/ansh0eman/Desktop/NearHere/apps/mobile/types/activity.ts)
- [activity validation](/Users/ansh0eman/Desktop/NearHere/apps/mobile/lib/activity-validation.ts)

For each function, identify:

```text
input
output
state or mutation
failure path
caller
```

## Week 2: React and React Native

### Session 6 — Components and props

Learn:

- components
- JSX
- props
- composition

Exercise: build a typed `ActivityCard`.

### Session 7 — State and events

Learn:

- `useState`
- press events
- controlled text inputs
- immutable state updates

Exercise: build a title input and activity filter.

### Session 8 — UI state

Learn:

- conditional rendering
- loading, empty, ready, and error branches
- lists
- stable keys

Exercise: render the same activity list in every state.

### Session 9 — Lifecycle and hooks

Learn:

- `useEffect`
- cleanup
- `useMemo`
- `useCallback`
- `useRef`

Exercise: load mock activities, clean up a subscription, and ignore a stale
request.

### Session 10 — Read one vertical slice

Read:

- [root layout](/Users/ansh0eman/Desktop/NearHere/apps/mobile/app/_layout.tsx)
- [Nearby screen](/Users/ansh0eman/Desktop/NearHere/apps/mobile/app/(tabs)/index.tsx)
- [Nearby hook](/Users/ansh0eman/Desktop/NearHere/apps/mobile/hooks/use-nearby-activities.ts)

Trace:

```text
screen → hook → repository → backend → parser → state → UI
```

---

# Part VII — Exercises

## Exercise 1: Type a domain object

```ts
type NearbyActivity = {
  id: string;
  title: string;
  distanceM: number;
  participantCount: number;
  capacity: number;
};
```

Explain why each property has its type.

## Exercise 2: Model a state machine

```ts
type ActivitiesState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'ready'; activities: NearbyActivity[] }
  | { status: 'error'; message: string };
```

Explain which properties are available in each branch.

## Exercise 3: Build a component

Write a component that accepts:

```ts
type ActivityCardProps = {
  title: string;
  onPress: () => void;
};
```

Then explain how data flows from parent to child.

## Exercise 4: Trace a request

Explain this without looking at the guide:

```text
screen → hook → repository → RPC → database → parser → state → UI
```

For every arrow, state which responsibility crosses the boundary.

## Exercise 5: Debug a stale response

Imagine this sequence:

```text
request A starts for location X
request B starts for location Y
request B finishes
request A finishes later
```

Explain why applying request A's result after request B would show incorrect
data, and explain how a request ID stored in `useRef` prevents it.

---

# Part VIII — Interview language

After Week 1, you should be able to say:

> “I use TypeScript to make domain data and UI states explicit. I distinguish
> compile-time types from runtime validation because API and storage data can be
> malformed.”

After Week 2, you should be able to say:

> “NearHere's React screens compose UI from props and state. Hooks own lifecycle
> and asynchronous request state, while repositories isolate Supabase calls and
> parsers convert unknown responses into typed application data.”

For a technical follow-up:

> “I model loading, success, empty, and error states explicitly instead of
> assuming a request either succeeds immediately or produces a generic spinner.
> This makes failure behavior part of the product contract.”

Do not claim mastery just because you can repeat these sentences. You should be
able to point to a file, explain the control flow, and describe one failure
case.

---

# Glossary

**Variable:** a named reference to a value.

**Function:** reusable behavior that accepts inputs and returns a result.

**Object:** a collection of named properties.

**Type:** a compile-time description of allowed data.

**Union:** a type allowing one of several alternatives.

**Runtime:** the time when the application is actually executing.

**Component:** a function that returns UI.

**Props:** inputs passed into a component.

**State:** data owned by a component or hook that can change over time.

**Hook:** a React function that connects a component to state, lifecycle, or
another React capability.

**Effect:** code that synchronizes React with an external system.

**Repository:** a boundary that hides data-access details from the UI.

**State machine:** explicit states and allowed transitions, such as loading to
ready or loading to error.

**Immutable update:** creating a new array or object instead of changing the
existing value in place.

---

# Completion checklist

You are ready to continue to the next NearHere section when you can:

- Explain `const`, `let`, objects, arrays, and functions.
- Read a TypeScript type and describe the values it permits.
- Explain `string | null`.
- Explain why `unknown` needs runtime validation.
- Write and narrow a loading/ready/error union.
- Explain what a React component returns.
- Distinguish props from state.
- Explain why state updates trigger rendering.
- Describe what `useEffect` is for.
- Explain why an effect needs cleanup.
- Trace a Nearby request from screen to database and back.
- Explain one engineering trade-off in your own words.

If one item is unclear, repeat only that subsection and create a tiny example.
Do not restart the entire guide.
