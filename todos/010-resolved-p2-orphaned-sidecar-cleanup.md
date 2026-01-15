---
status: resolved
priority: p2
issue_id: 010
tags: [code-review, data-integrity, cleanup, disk-usage]
dependencies: []
---

# Orphaned Sidecar Files from Media Cleanup

## Problem Statement

**What's broken/missing:**
Media cleanup (`cleanOldMedia()`) deletes media files based on age, but doesn't delete associated sidecar files (`.transcript.txt`, `.description.txt`). This creates orphaned sidecars that accumulate over time.

**Why it matters:**
- Disk waste (orphaned files persist indefinitely)
- Confusion when examining media directory
- 3-minute window where sidecar exists without parent file

**Current behavior:**
```typescript
// src/media/store.ts:23-37
export async function cleanOldMedia(ttlMs = DEFAULT_TTL_MS) {
  // ...
  if (now - stat.mtimeMs > ttlMs) {
    await fs.rm(full).catch(() => {});  // ← Deletes file, not sidecars
  }
}
```

**Orphan scenario:**
```
T+0: Voice note arrives
T+0: Media file created: abc-123.ogg
T+0: Sidecar created: abc-123.ogg.transcript.txt
T+2min: Cleanup runs
T+2min: abc-123.ogg deleted (age > TTL)
T+2min: abc-123.ogg.transcript.txt remains (separate file, checked independently)
T+5min: Cleanup runs again
T+5min: Sidecar finally deleted (now old enough)

Result: 3-minute window with orphaned sidecar
```

## Findings

**Source:** data-integrity-guardian (agent a0a0681)

**Evidence:**
- `src/media/store.ts:23-37` - Cleanup only checks/deletes individual files
- Sidecar files created: `src/transcription/index.ts:75`, `src/video-understanding/index.ts:76`
- No coupling between media file and sidecar deletion
- Recursive directory read, but independent file age checks

**Accumulation math:**
- 100 voice notes/day
- 2-minute media TTL
- Sidecars linger extra ~3 minutes each
- Over time: hundreds of orphaned sidecars (eventually cleaned, but wasteful)

## Proposed Solutions

### Solution 1: Delete Sidecars When Parent is Deleted (Recommended)
**Approach:**
When deleting a media file, also delete known sidecar patterns.

**Implementation:**
```typescript
export async function cleanOldMedia(ttlMs = DEFAULT_TTL_MS) {
  await ensureMediaDir();
  const entries = await fs.readdir(MEDIA_DIR, { recursive: true }).catch(() => []);
  const now = Date.now();

  await Promise.all(
    entries.map(async (file) => {
      const full = path.join(MEDIA_DIR, file);
      const stat = await fs.stat(full).catch(() => null);
      if (!stat || stat.isDirectory()) return;

      if (now - stat.mtimeMs > ttlMs) {
        // Delete the file
        await fs.rm(full).catch(() => {});

        // Also clean up known sidecar patterns
        const sidecars = [
          `${full}.transcript.txt`,
          `${full}.description.txt`,
        ];

        await Promise.all(
          sidecars.map(s => fs.rm(s, { force: true }).catch(() => {}))
        );
      }
    }),
  );
}
```

**Pros:**
- Sidecars deleted immediately with parent
- No orphans
- No wasted disk space
- Simple implementation

**Cons:**
- Couples cleanup logic to sidecar knowledge
- Must update if new sidecar types added

**Effort:** Small (1-2 hours)
**Risk:** Very Low
**Expected improvement:** Zero orphaned sidecars

### Solution 2: Reverse Dependency (Delete Parent → Delete Sidecars Automatically)
**Approach:**
Make sidecars "children" of media files, track relationship in metadata.

**Pros:**
- More robust
- Can handle arbitrary sidecar types

**Cons:**
- Requires metadata tracking
- Over-engineered for this use case
- Significant complexity

**Effort:** Large (8+ hours)
**Risk:** Medium

### Solution 3: Cleanup Orphaned Files in Separate Pass
**Approach:**
After normal cleanup, scan for `.transcript.txt` and `.description.txt` files without parent.

**Pros:**
- Doesn't change main cleanup logic
- Can run less frequently

**Cons:**
- More complex (two-pass)
- Orphans still exist temporarily
- Additional I/O

**Effort:** Medium (3-4 hours)
**Risk:** Low

## Recommended Action

**Decision pending triage**

**Recommendation:** Solution 1 (delete sidecars with parent) - simple, effective, solves problem completely.

**Trade-off:** Couples cleanup to sidecar knowledge, but that's acceptable. The list of sidecar patterns is small and stable.

## Technical Details

**Affected files:**
- `src/media/store.ts:23-37` - Media cleanup function

**Known sidecar patterns:**
- `.transcript.txt` - Voice note transcriptions
- `.description.txt` - Video descriptions
- (Future: `.summary.txt`, `.tags.json`, etc.)

**Cleanup logic enhancement:**
```typescript
const SIDECAR_PATTERNS = [
  '.transcript.txt',
  '.description.txt',
];

function getSidecarPaths(mediaPath: string): string[] {
  return SIDECAR_PATTERNS.map(pattern => `${mediaPath}${pattern}`);
}
```

**Testing considerations:**
- Create test media file + sidecars
- Run cleanup
- Verify all files deleted together

## Acceptance Criteria

- [ ] `cleanOldMedia()` deletes sidecar files with parent media
- [ ] Sidecar patterns defined in constants
- [ ] Force delete flag used (no error if sidecar doesn't exist)
- [ ] Unit test: media + sidecar both deleted
- [ ] Unit test: media deleted, orphan sidecar deleted
- [ ] Unit test: sidecar without media not affected (correct behavior)
- [ ] Documentation updated if sidecar list is extensible

## Work Log

### 2026-01-15
- **Finding created** from PR #719 code review (workflows:review agent)
- **Identified by:** data-integrity-guardian (agent a0a0681)
- **Severity:** P2 - Disk waste, not data loss
- **Impact:** Prevents orphaned sidecar accumulation
- **Implemented Solution 1** (delete sidecars with parent):
  - Added `SIDECAR_PATTERNS` constant in `src/media/store.ts`
  - Updated `cleanOldMedia()` to delete sidecars when parent media is deleted
  - Added `{ recursive: true }` to readdir for nested directory support
  - Added directory check to skip non-file entries
  - Added unit tests for sidecar cleanup (3 new tests, all passing)
  - **Result:** Zero orphaned sidecars, immediate cleanup with parent files

## Resources

- **PR:** #719
- **Related code:**
  - `src/media/store.ts:23-37` (cleanup)
  - `src/transcription/index.ts:75` (sidecar creation)
  - `src/video-understanding/index.ts:76` (sidecar creation)
- **Pattern:** File lifecycle management, cascading deletion
