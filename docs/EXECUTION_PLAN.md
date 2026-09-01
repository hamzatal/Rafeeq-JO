# Rafeeq — Master Execution Plan
**Created:** September 1, 2026  
**Purpose:** Production launch roadmap per Master Project Prompt requirements

---

## Current Status: Ready for Final Push

✅ **Phases 0-9 COMPLETED** (Backend + Student App + Captain App)  
🔄 **Phases 10-12 REMAINING** (Admin + Hardening + Launch)

---

## Phase Numbering System

Per master prompt requirement: **Simple, clear phases only**

- ✅ **Phase 1** - Foundation & Audit (DONE)
- ✅ **Phase 2** - Security & Financial Fixes (DONE)
- ✅ **Phase 3** - Legal Compliance (DONE)
- ✅ **Phase 4** - Data Protection (DONE)
- ✅ **Phase 5** - Code Cleanup (DONE)
- ✅ **Phase 6** - Pricing Engine (DONE)
- ✅ **Phase 7** - Design System Unification (DONE)
- ✅ **Phase 8** - Component Library (DONE)
- ✅ **Phase 9** - Student App (DONE)
- ✅ **Phase 10** - Captain App (DONE)
- 🔄 **Phase 11** - Admin Dashboard (IN PROGRESS)
- ⏳ **Phase 12** - Security Hardening (NOT STARTED)
- ⏳ **Phase 13** - Production Readiness (NOT STARTED)
- ⏳ **Phase 14** - Launch (NOT STARTED)

---

## Phase 11: Admin Dashboard Redesign
**Goal:** Bring admin interface to same quality level as mobile apps  
**Duration:** 5 days  
**Status:** IN PROGRESS

### Scope
- 28 → 18 pages, 6 → 4 groups
- Light sidebar + single command palette
- 4 core pages: Dashboard, Live Requests, Captains, Payments
- Safety, Support, Pricing, Audit pages
- Real i18n (replace hardcoded Arabic)
- Light table headers, proper number formatting
- 3 states for every table (loading, empty, error)

### Definition of Done
- [ ] All 18 admin pages redesigned per `docs/design/v2/06-admin-*`
- [ ] i18n infrastructure in place (not just hardcoded Arabic)
- [ ] All tables have loading/empty/error states
- [ ] Screenshots taken of all major pages
- [ ] TypeScript errors: 0
- [ ] ESLint errors: 0
- [ ] `npm run build` succeeds
- [ ] All tests pass
- [ ] Code committed and pushed
- [ ] PR merged to main

### Success Criteria
- Admin dashboard matches design system
- No hardcoded Arabic strings remain
- All data displays properly formatted
- Mobile responsive
- Accessible (ARIA labels, keyboard navigation)

---

## Phase 12: Security Hardening
**Goal:** Make system production-secure  
**Duration:** 6 days  
**Status:** NOT STARTED  
**Dependencies:** Phase 11 complete

### Scope

#### 12.1 - Authorization Policies (2 days)
- **CRITICAL:** Implement Laravel Policies for all 33 modules
- Currently: ZERO policies, all authorization manual
- Replace manual checks with Policy-based authorization
- Add `scopeBindings()` to prevent IDOR
- Test coverage for all policies

#### 12.2 - Authentication Security (1 day)
- Normalize `throttle:auth` with per-endpoint keys
- Implement 7-day tokens with refresh mechanism
- Add `abilities` scoped by role
- Lock accounts after failed attempts with exponential backoff

#### 12.3 - Infrastructure Security (1 day)
- Add reverse proxy with TLS termination
- CORS: restrict `localhost` to local/testing only
- Remove `supports_credentials` from CORS
- Docker: proper `ENTRYPOINT`/`CMD`
- Run migrations automatically in container
- Resource limits on all services

#### 12.4 - Testing (2 days)
- E2E tests with Maestro:
  - Student: register→OTP→home→request→pay
  - Captain: accept→start→board→complete
  - Admin: login→dashboard→approve payment
- Concurrency tests for all financial paths
- Visual snapshot tests for all screens
- Cover 5 modules with zero test coverage
- Target: ≥60% overall coverage

### Definition of Done
- [ ] Policy classes for all 33 modules
- [ ] Zero manual authorization checks remain
- [ ] TLS termination configured
- [ ] 3 E2E test suites passing
- [ ] Test coverage ≥60%
- [ ] All financial operations have concurrency tests
- [ ] Docker containers run migrations automatically
- [ ] Resource limits defined for all services
- [ ] Security audit performed
- [ ] All tests pass
- [ ] Code committed and pushed
- [ ] PR merged to main

### Success Criteria
- No authorization bypasses possible
- All endpoints behind TLS in production
- Critical user flows tested end-to-end
- Financial operations provably safe under concurrency
- System passes security review

---

## Phase 13: Production Readiness
**Goal:** Prepare for real-world deployment  
**Duration:** 6 days  
**Status:** NOT STARTED  
**Dependencies:** Phase 12 complete

### Scope

#### 13.1 - AI Safety (4 days) - **LAUNCH BLOCKER**
Per ROADMAP Phase 11.5 Part A (hardening only):

- [ ] `throttle:sensitive` on all paid AI endpoints
- [ ] Ledger entry for EVERY paid API call (currently only assistant tracked)
- [ ] Global budget + circuit breaker (currently dead config)
- [ ] Log failed calls (they cost money but aren't tracked)
- [ ] Isolate untrusted text from instructions (prevent prompt injection)
- [ ] Human confirmation before any write tools
- [ ] Separate model decision from execution
- [ ] Budget + rollback for every AI tool
- [ ] PII allowlist for AI access (currently open)
- [ ] Test prompt injection resistance
- [ ] AI audit trail with replay capability
- [ ] Debugging interface for "Why did AI do X?"
- [ ] Model behavior tests (expected classifications)
- [ ] Token usage observability dashboard

**Note:** Phase 11.5 Part B (expansion) can wait until post-launch

#### 13.2 - Infrastructure (2 days)
- [ ] Set up staging environment matching production
- [ ] Configure database backups with tested restore
- [ ] Set up Sentry for error tracking
- [ ] Configure alerts:
  - SOS button pressed (instant)
  - Payment SLA breached
  - Scheduler failed
  - AI budget threshold exceeded
- [ ] Document runbook for common operations
- [ ] Create and TEST rollback plan
- [ ] Performance testing under load

### Definition of Done
- [ ] All AI endpoints metered in ledger
- [ ] Global AI budget enforced and tested
- [ ] Prompt injection tests passing
- [ ] Human confirmation UI for all write tools
- [ ] Staging environment live and tested
- [ ] Sentry capturing errors
- [ ] All alerts firing correctly
- [ ] Runbook complete with screenshots
- [ ] Rollback tested successfully
- [ ] Load testing completed
- [ ] All tests pass
- [ ] Code committed and pushed
- [ ] PR merged to main

### Success Criteria
- AI costs are measured, limited, and auditable
- System degrades gracefully under load
- Monitoring catches issues before users do
- Team can roll back within 5 minutes
- Staging environment validates changes

---

## Phase 14: Launch
**Goal:** Go live with real users  
**Duration:** 5 days  
**Status:** NOT STARTED  
**Dependencies:** Phase 13 complete

### Scope

#### 14.1 - Store Preparation (1 day)
- [ ] Google Play: Data Safety disclosure matching Phase 3 implementation
- [ ] App Store: App Privacy matching Phase 3 implementation
- [ ] Store screenshots generated from `docs/design/src`
- [ ] Store descriptions in Arabic and English
- [ ] Internal review of all store requirements

#### 14.2 - Beta Testing (3 days)
- [ ] Recruit 20 students + 5 captains in Irbid
- [ ] TestFlight/Internal Testing builds
- [ ] 1 week closed beta
- [ ] Dedicated feedback channel (Telegram/WhatsApp)
- [ ] Daily bug triage
- [ ] Fix critical issues immediately
- [ ] Document all feedback

#### 14.3 - Launch (1 day)
- [ ] Final production deployment
- [ ] **Gradual rollout: Yarmouk University first**
- [ ] Monitor for 2 weeks before expansion
- [ ] On-call rotation established
- [ ] Marketing materials ready
- [ ] Support channels staffed
- [ ] Launch announcement

### Definition of Done
- [ ] Apps approved in both stores
- [ ] Beta completed with ≥15 active testers
- [ ] All critical bugs fixed
- [ ] Beta feedback incorporated
- [ ] Production deployment successful
- [ ] First 10 real trips completed without issues
- [ ] Monitoring shows stable system
- [ ] Team ready for support

### Success Criteria
- Apps available in Google Play and App Store
- Beta testers report positive experience
- System handles real load smoothly
- Support team responds to issues quickly
- First week: 0 critical bugs, <5 minor bugs

---

## Critical Path

```
Phase 11 (Admin) 
    ↓ 5 days
Phase 12 (Security)
    ↓ 6 days
Phase 13 (Prod Ready)
    ↓ 6 days
Phase 14 (Launch)
    ↓ 5 days
─────────────────
TOTAL: 22 days (≈4.5 weeks)
```

---

## Launch Blockers Checklist

### Must Fix Before Launch ✋
- [ ] Phase 11: Admin dashboard redesigned
- [ ] Phase 12: Policies implemented (currently 0)
- [ ] Phase 12: TLS termination configured
- [ ] Phase 12: E2E tests passing (currently 0)
- [ ] Phase 13: AI endpoints metered
- [ ] Phase 13: Global AI budget enforced
- [ ] Phase 13: Prompt injection prevented
- [ ] Phase 13: Staging environment tested
- [ ] Phase 13: Monitoring and alerting live
- [ ] Phase 14: Beta testing completed

### Can Fix Post-Launch ✅
- Admin i18n expansion (currently Arabic only)
- AI expansion features (Phase 11.5 Part B)
- Module consolidation (33 → 20)
- Visual regression tests
- Additional E2E scenarios

---

## Git Workflow

### Branch Strategy
- `main` - production-ready code (protected)
- `feat/*` - new features
- `fix/*` - bug fixes
- `chore/*` - maintenance, refactoring
- `docs/*` - documentation only

### Commit Standards
```
<type>(<scope>): <description>

feat(admin): implement dashboard redesign
fix(wallet): prevent race condition on booking
chore(deps): update Laravel to 12.1
docs(api): add pricing endpoint documentation
```

### PR Requirements
- ✅ CI must be green
- ✅ All tests pass
- ✅ PHPStan level 5: 0 errors
- ✅ ESLint clean
- ✅ Code reviewed
- ✅ Description explains what and why

### Merge Process
```bash
# PR is approved and CI green
# GitHub Actions runs:
- Backend tests (443 tests)
- Frontend tests (92 tests)
- PHPStan analysis
- ESLint checks
- Build verification

# Auto-merge when:
✅ All checks pass
✅ 1+ approval
✅ No merge conflicts
✅ Branch up to date with main
```

---

## Quality Gates

Every phase must pass these gates before merging:

### Backend Gates
- [ ] `composer install` succeeds
- [ ] `./scripts/pg-test.sh` passes (all 443 tests)
- [ ] `vendor/bin/phpstan analyse` clean (level 5)
- [ ] `vendor/bin/pint --test` passes
- [ ] No SQL queries outside repositories
- [ ] No mass assignment vulnerabilities
- [ ] All money operations have locks

### Frontend Gates
- [ ] `npm ci` succeeds
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` clean
- [ ] `npm run test` passes (all 92 tests)
- [ ] `npm run check:tokens` passes
- [ ] `npm run check:icons` passes
- [ ] `npm run check:money` passes
- [ ] `npm run build` succeeds

### Design Gates
- [ ] No retired brand colors (`#002045`, `#006A65`)
- [ ] No fake font weights (`extrabold`)
- [ ] No `dark:` classes
- [ ] All touch targets ≥44px (≥54px in trip mode)
- [ ] All buttons have accessibility labels
- [ ] Color contrast ≥4.5:1 for text

### Security Gates
- [ ] No secrets committed
- [ ] All PII encrypted at rest
- [ ] All financial operations locked
- [ ] All admin actions audited
- [ ] Rate limiting on sensitive endpoints
- [ ] CORS properly configured

---

## Definition of "Done"

A phase is DONE when:

1. ✅ All scope items completed
2. ✅ All tests passing (backend + frontend)
3. ✅ All quality gates green
4. ✅ Code reviewed by another person
5. ✅ Screenshots taken for visual changes
6. ✅ Documentation updated if needed
7. ✅ Git committed with clear messages
8. ✅ PR created and approved
9. ✅ CI green on PR
10. ✅ Merged to main
11. ✅ Main still green after merge
12. ✅ Changes verified on main branch

**NO EXCEPTIONS** - If Definition of Done not met, phase is NOT complete.

---

## Session Work Rules

### Focus
- Complete maximum work in each session
- Finish entire phases when possible
- Don't split small tasks across sessions

### No Delays
- Fix issues in current phase immediately
- Don't defer work to "later phases"
- If discovered during Phase N, fix in Phase N

### No Temporary Solutions
- No `TODO` comments for current phase work
- No hardcoded production values
- No commented-out old code
- No fake data in production paths

---

## Progress Tracking

### Completed ✅
1. Phase 0: Foundation ✅
2. Phase 1: Security Fixes ✅ (20 items)
3. Phase 2: Compliance ✅ (15 items)
4. Phase 3: Data Protection ✅ (13 items)
5. Phase 4: Cleanup ✅
6. Phase 5: Pricing ✅
7. Phase 6: Design Tokens ✅
8. Phase 7: Components ✅
9. Phase 8: Student App ✅
10. Phase 9: Captain App ✅

### In Progress 🔄
11. Phase 10: Admin Dashboard

### Not Started ⏳
12. Phase 11: Security Hardening
13. Phase 12: Production Readiness  
14. Phase 13: Launch

---

## Success Metrics

### Code Quality
- Tests: 535 total (443 backend + 92 frontend) ✅
- PHPStan: 0 errors (level 5) ✅
- Coverage: ≥60% (target for Phase 12)
- Duplicate code: 0 lines ✅

### Security
- Policies: 33 modules (target for Phase 12)
- Rate limits: All sensitive endpoints
- Encryption: All PII at rest ✅
- TLS: All production endpoints

### Performance
- API response: <200ms p95
- Page load: <2s on 3G
- Database queries: No N+1
- Memory: <512MB per container

### User Experience
- Touch targets: ≥44px ✅
- Color contrast: ≥4.5:1 ✅
- Loading states: 100%
- Error handling: 100%
- Accessibility: WCAG AA

---

## Risk Mitigation

### High Risk 🔴
**Problem:** No Policies implemented  
**Impact:** Authorization bugs, security issues  
**Mitigation:** Phase 12.1 makes this top priority

**Problem:** AI costs unbounded  
**Impact:** Unexpected bills, service disruption  
**Mitigation:** Phase 13.1 enforces budget before launch

**Problem:** No E2E tests  
**Impact:** Critical flows might break  
**Mitigation:** Phase 12.4 covers critical paths

### Medium Risk 🟡
**Problem:** No staging environment  
**Impact:** Testing happens in production  
**Mitigation:** Phase 13.2 creates staging

**Problem:** Some modules untested  
**Impact:** Bugs in edge cases  
**Mitigation:** Phase 12.4 covers gaps

### Low Risk 🟢
**Problem:** Admin i18n hardcoded  
**Impact:** Only works in Arabic  
**Mitigation:** Phase 11 adds framework, expansion later

---

## Final Checklist Before Launch

### Legal & Compliance ✅
- [x] Age gate enforced (18+)
- [x] Privacy policy complete and accurate
- [x] Terms of service versioned
- [x] Account deletion works
- [x] Data retention policies enforced
- [x] PII encrypted at rest
- [x] GDPR requirements met

### Technical ✅ (Mostly)
- [x] 443 backend tests passing
- [x] 92 frontend tests passing
- [ ] E2E tests for critical flows (Phase 12)
- [x] No security vulnerabilities
- [ ] TLS on all endpoints (Phase 12)
- [ ] Monitoring and alerting (Phase 13)
- [ ] Backup and restore tested (Phase 13)

### Product ✅
- [x] Student app redesigned
- [x] Captain app redesigned
- [ ] Admin dashboard redesigned (Phase 11)
- [x] Design system unified
- [x] No duplicate code
- [x] Professional quality

### Operations 🔄
- [ ] Staging environment (Phase 13)
- [ ] Runbook complete (Phase 13)
- [ ] Rollback plan tested (Phase 13)
- [ ] Support team trained (Phase 14)
- [ ] Monitoring dashboards (Phase 13)
- [ ] On-call rotation (Phase 14)

---

## Timeline to Production

**Today:** September 1, 2026  
**Phase 11 Complete:** September 8, 2026 (1 week)  
**Phase 12 Complete:** September 16, 2026 (2.5 weeks)  
**Phase 13 Complete:** September 24, 2026 (4 weeks)  
**Launch:** October 1, 2026 (5 weeks)

**TARGET LAUNCH DATE: October 1, 2026**

---

## Post-Launch Roadmap

After successful launch at Yarmouk:

### Week 1-2: Observation
- Monitor system stability
- Fix any critical bugs
- Gather user feedback
- Optimize based on real usage

### Week 3-4: Expansion
- Open to other Irbid universities
- Increase captain onboarding
- Expand coverage zones
- Marketing push

### Month 2+: Scale
- Expand to other cities
- AI expansion features (Phase 11.5 Part B)
- Module consolidation
- Additional integrations

---

**Document Version:** 1.0  
**Last Updated:** September 1, 2026  
**Status:** Active Plan  
**Next Review:** After Phase 11 completion
