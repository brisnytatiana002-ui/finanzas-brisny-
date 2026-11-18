# Security Specification (`Mi Presupuesto Mensual`)

## 1. Data Invariants
1. **Strict Multi-Tenant Isolation**: Every user profile (`/users/{userId}`), monthly budget (`/users/{userId}/months/{monthId}`), and financial movement (`/users/{userId}/movements/{movementId}`) belongs strictly to `request.auth.uid == userId`. No user can read, list, create, update, or delete another user's records.
2. **Parent Existence Gate**: Subcollection documents (`months`, `movements`) cannot be created or updated unless the parent `/users/{userId}` document exists.
3. **Immutable Ownership & Creation Timestamps**: `uid`, `ownerId`, and `createdAt` cannot be modified after creation. `createdAt` and `updatedAt` must match `request.time`.
4. **Strict Payload Boundaries**: All strings enforce `.size()` bounds matching `firebase-blueprint.json`; amounts must be positive numbers (`> 0` for movements, `>= 0` for budgets); shadow/unknown fields are rejected via `keys().hasOnly(...)` and `affectedKeys().hasOnly(...)`.

## 2. Dirty Dozen Adversarial Payloads (Expected: `PERMISSION_DENIED`)
1. Unauthenticated read on `/users/userA`.
2. Authenticated `userB` attempting `get` on `/users/userA` (PII leak attempt).
3. Authenticated `userB` attempting `list` on `/users/userA/movements` (cross-tenant scrape).
4. Authenticated `userA` attempting `create` on `/users/userA` with `uid: "userB"` (identity spoofing).
5. Authenticated `userA` attempting `create` on `/users/userA` with an extra shadow field `isAdmin: true`.
6. Authenticated `userA` attempting `create` on `/users/userA` with a client-spoofed `createdAt` timestamp instead of `request.time`.
7. Authenticated `userA` attempting `create` on `/users/userA/movements/bad..id` (invalid path variable).
8. Authenticated `userA` attempting `create` on `/users/userA/movements/mov1` with `amount: -5000`.
9. Authenticated `userA` attempting `create` on `/users/userA/movements/mov1` with `description` exceeding 200 characters (DoW / resource poisoning).
10. Authenticated `userA` attempting `update` on `/users/userA/months/2026-11` changing `ownerId` or `monthId`.
11. Authenticated `userA` attempting `update` on `/users/userA/movements/mov1` changing `createdAt`.
12. Authenticated `userA` attempting `create` on `/users/userA/movements/mov1` with `type: "transfer"` (invalid enum).
