# Supabase Client Creation Patterns - Edge Functions Analysis

**Generated:** April 29, 2026  
**Total Functions Analyzed:** 22  
**Report Date Range:** All 22 Edge Functions in `backend/supabase/functions/`

---

## Executive Summary

**Critical Finding:** 11 of 22 Edge Functions have a **RLS-blocking anti-pattern** where `SERVICE_ROLE_KEY` is used WITH the user's `Authorization` header passed in global headers. This bypasses RLS but is semantically confusing and potentially buggy.

**Only 1 function correctly implements the dual-client pattern** (update-excursion).

---

## Pattern Breakdown

### Pattern 1: Simple SERVICE_ROLE_KEY (No Auth Header)
**Count: 10 functions**

These functions use `SERVICE_ROLE_KEY` without passing the user's Authorization header. They completely bypass RLS.

**Functions:**
1. ✅ **auth-check-email** — RPC for email existence (public check)
2. ✅ **auth-check-username** — RPC for username existence (public check)
3. ✅ **auth-login** — Auth operation (no RLS needed)
4. ✅ **auth-logout** — Auth operation (no RLS needed)
5. ✅ **get-filtered-excursions** — RPC call with optional auth (reads public data + user state if auth provided)
6. ✅ **get-excursion-detail** — RPC call (reads public excursion data)
7. ✅ **get-excursion-participants** — Selects from participacion table (public read)
8. ✅ **download-gpx** — Storage operation (SERVICE_ROLE_KEY correctly used to bypass Storage RLS)
9. ✅ **create-excursion-with-gpx** — Calls RPC for creation (server-side logic)
10. ✅ **parse-and-create-excursion** — Calls RPC for creation (server-side logic)

**Code Pattern:**
```typescript
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)
// No Authorization header in global headers
// Pure SERVICE_ROLE_KEY client
```

**Assessment:** ✅ **SAFE** — These are either auth operations, public data reads, or server-side logic calls via RPC. Correct pattern.

---

### Pattern 2: SERVICE_ROLE_KEY + Authorization Header (RLS-BLOCKING ANTI-PATTERN)
**Count: 11 functions** ⚠️ **PROBLEMATIC**

These functions create a `SERVICE_ROLE_KEY` client but inject the user's Authorization token in the global headers. This defeats RLS because:
1. The key is SERVICE_ROLE, so it bypasses RLS anyway
2. The Authorization header is ignored by the SDK when SERVICE_ROLE_KEY is used
3. It's semantically confusing to readers and maintainers

**Functions:**
1. ❌ **delete-excursion** — Deletes excursion (requires RLS check that owner can delete)
2. ❌ **finish-excursion** — Marks excursion as finished (requires owner check)
3. ❌ **get-pending-requests** — Lists join requests for organizer (needs RLS to prevent seeing others' requests)
4. ❌ **join-excursion** — User joins excursion (should use RLS)
5. ❌ **leave-excursion** — User leaves excursion (should use RLS)
6. ❌ **cancel-join-request** — User cancels their request (should use RLS)
7. ❌ **request-join-excursion** — User requests to join (should use RLS)
8. ❌ **respond-join-request** — Organizer approves/rejects request (needs RLS for ownership check)
9. ❌ **confirm-attendance** — Marks attendance (needs RLS for owner/admin check)
10. ❌ **get-my-excursions** — Lists user's excursions (needs RLS to filter by user)
11. ❌ **auth-complete-registration** — Creates user profile (uses SERVICE_ROLE with auth header)

**Code Pattern (The Problematic Mix):**
```typescript
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',  // ← SERVICE_ROLE_KEY
  {
    global: { headers: { Authorization: authHeader } },  // ← Auth header added (ignored!)
    auth: { autoRefreshToken: false, persistSession: false },
  }
)

// Then later:
const { data: { user }, error: userError } = await supabase.auth.getUser(token)
// ↑ This auth check is the only actual authorization being done
```

**Assessment:** ❌ **PROBLEMATIC** — These functions rely on manual authorization checks (`if (user.id !== organizerId)`) because RLS is bypassed. If those checks are missed or buggy, data leaks are possible.

**Current Workaround:** Each function manually verifies ownership/authorization after fetching data. This works but is error-prone.

---

### Pattern 3: Dual-Client Pattern (CORRECT for sensitive operations)
**Count: 1 function** ✅ **BEST PRACTICE**

**Function:**
- ✅ **update-excursion** — Updates excursion fields (requires owner authorization)

**Code Pattern:**
```typescript
// Client 1: For authorization check (ANON_KEY)
const authClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  {
    global: { headers: { Authorization: authHeader } },  // User's token
    auth: { autoRefreshToken: false, persistSession: false },
  }
)

// Client 2: For data operations (SERVICE_ROLE_KEY)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',  // Server-only key
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
)

// Use authClient to validate user
const { data: { user } } = await authClient.auth.getUser(token)

// Use supabase to bypass RLS for the actual operation
const { data: excursion } = await supabase
  .from('excursion')
  .select('id, creadoPor, ...')
  .eq('id', excursionId)
  .single()

// Manual authorization check
if (excursion.creadoPor !== user.id) {
  return unauthorized()
}

// Then update
await supabase.from('excursion').update(updates).eq('id', excursionId)
```

**Assessment:** ✅ **SAFE & EXPLICIT** — Clear separation of concerns. Auth validation uses user credentials, data modification uses service role. Authorization logic is explicit and easy to audit.

---

## Summary Table

| Function | Key Type | Auth Header | RLS Bypass | Issue | Recommendation |
|----------|----------|-------------|-----------|-------|-----------------|
| **auth-check-email** | SERVICE_ROLE | ❌ No | ✅ Intentional | None | OK |
| **auth-check-username** | SERVICE_ROLE | ❌ No | ✅ Intentional | None | OK |
| **auth-login** | SERVICE_ROLE | ❌ No | ✅ Intentional | None | OK |
| **auth-logout** | SERVICE_ROLE | ❌ No | ✅ Intentional | None | OK |
| **auth-complete-registration** | SERVICE_ROLE | ✅ Yes | ⚠️ Confusing | Mixed pattern | Cleanup (not critical) |
| **get-filtered-excursions** | SERVICE_ROLE | ❌ No | ✅ Intentional | None | OK |
| **get-excursion-detail** | SERVICE_ROLE | ❌ No | ✅ Intentional | None | OK |
| **get-excursion-participants** | SERVICE_ROLE | ❌ No | ✅ Intentional | None | OK |
| **download-gpx** | SERVICE_ROLE | ❌ No | ✅ Intentional | None | OK |
| **create-excursion-with-gpx** | SERVICE_ROLE | ❌ No | ✅ Intentional | None | OK |
| **parse-and-create-excursion** | SERVICE_ROLE | ❌ No | ✅ Intentional | None | OK |
| **delete-excursion** | SERVICE_ROLE | ✅ Yes | ⚠️ Bypassed | RLS ignored | **FIX: Use dual-client pattern** |
| **finish-excursion** | SERVICE_ROLE | ✅ Yes | ⚠️ Bypassed | RLS ignored | **FIX: Use dual-client pattern** |
| **get-pending-requests** | SERVICE_ROLE | ✅ Yes | ⚠️ Bypassed | RLS ignored | **FIX: Use dual-client pattern** |
| **join-excursion** | SERVICE_ROLE | ✅ Yes | ⚠️ Bypassed | RLS ignored | **FIX: Use dual-client pattern** |
| **leave-excursion** | SERVICE_ROLE | ✅ Yes | ⚠️ Bypassed | RLS ignored | **FIX: Use dual-client pattern** |
| **cancel-join-request** | SERVICE_ROLE | ✅ Yes | ⚠️ Bypassed | RLS ignored | **FIX: Use dual-client pattern** |
| **request-join-excursion** | SERVICE_ROLE | ✅ Yes | ⚠️ Bypassed | RLS ignored | **FIX: Use dual-client pattern** |
| **respond-join-request** | SERVICE_ROLE | ✅ Yes | ⚠️ Bypassed | RLS ignored | **FIX: Use dual-client pattern** |
| **confirm-attendance** | SERVICE_ROLE | ✅ Yes | ⚠️ Bypassed | RLS ignored | **FIX: Use dual-client pattern** |
| **get-my-excursions** | SERVICE_ROLE | ✅ Yes | ⚠️ Bypassed | RLS ignored | **FIX: Use dual-client pattern** |
| **update-excursion** | DUAL | ANON for auth | ✅ Proper | None | ✅ GOLD STANDARD |

---

## Risk Analysis

### Functions with Authorization Concerns ⚠️

**HIGH RISK if manual checks fail:**
- `delete-excursion` — Can delete any excursion if ownership check fails
- `finish-excursion` — Can finish any excursion if ownership check fails
- `respond-join-request` — Organizer can accept/reject any request if ownership check fails

**MEDIUM RISK (user data leaks):**
- `get-pending-requests` — Could list all join requests if user check fails
- `get-my-excursions` — Could list other users' excursions if filtering fails

**LOW RISK (less critical):**
- `join-excursion`, `leave-excursion`, `request-join-excursion`, `cancel-join-request` — Insert/update operations on participacion table; RLS would normally prevent this
- `confirm-attendance` — Updates attendance; RLS would prevent unauthorized updates

---

## Recommendations

### Priority 1: Urgent (Data Integrity/Leaks)
1. **Audit manual authorization checks** in the 11 problematic functions for any gaps
2. **Test permission bypass scenarios** (e.g., user X trying to delete user Y's excursion)
3. **Document why RLS is bypassed** in each function (security review trail)

### Priority 2: Medium (Code Quality)
1. **Refactor Pattern 2 functions** to use dual-client pattern (like `update-excursion`)
   - Move authorization logic to use ANON_KEY client
   - Use SERVICE_ROLE_KEY client only for actual data operations
   - Makes intent explicit: "auth with user creds, operate with service role"

2. **Establish team standard:**
   - For public/non-user-specific data → Simple SERVICE_ROLE (current Pattern 1)
   - For user-specific data or ownership checks → Dual-client (Pattern 3)

### Priority 3: Optional (Cleanup)
1. Remove the unused `Authorization` header from Pattern 2 functions if not switching to dual-client pattern
2. Add clear comments explaining why RLS is bypassed (security audit trail)

---

## Code Example: How to Fix (Dual-Client Pattern)

**Before (Problematic):**
```typescript
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    global: { headers: { Authorization: authHeader } },  // ← Ignored!
    auth: { autoRefreshToken: false, persistSession: false },
  }
)

const { data: { user } } = await supabase.auth.getUser(token)
if (!user) return unauthorized()

// Relies on manual checks
const { data: row } = await supabase
  .from('some_table')
  .select('*')
  .eq('id', recordId)
  .single()

if (row.userId !== user.id) return forbidden()  // Manual check!
```

**After (Dual-Client Pattern):**
```typescript
// Client 1: User credentials for auth
const authClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  {
    global: { headers: { Authorization: authHeader } },  // ← Actually used!
    auth: { autoRefreshToken: false, persistSession: false },
  }
)

// Client 2: Server role for operations
const serverClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
)

// Validate user with ANON_KEY (respects RLS)
const { data: { user } } = await authClient.auth.getUser(token)
if (!user) return unauthorized()

// Fetch with SERVICE_ROLE_KEY for debugging/admin operations
// (or use serverClient to read what RLS would allow if needed)
const { data: row } = await serverClient
  .from('some_table')
  .select('*')
  .eq('id', recordId)
  .single()

// Same manual check, but now it's EXPLICIT that RLS is bypassed
if (row.userId !== user.id) return forbidden()

// Update with SERVICE_ROLE_KEY
await serverClient.from('some_table').update(updates).eq('id', recordId)
```

---

## Conclusion

**Current State:** The app is functional but uses inconsistent patterns. 11 functions bypass RLS with SERVICE_ROLE_KEY + auth header mix, relying entirely on manual authorization checks.

**Safety Status:** ✅ **Likely Safe** if authorization checks are implemented correctly. However, the pattern is fragile and error-prone.

**Recommended Path:** Gradually migrate problematic functions to dual-client pattern for clarity and maintainability. Update-excursion should serve as the reference implementation.
