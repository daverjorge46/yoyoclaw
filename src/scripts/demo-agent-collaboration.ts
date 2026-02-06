#!/usr/bin/env node

/**
 * DEMO: Multi-Agent Collaboration System
 *
 * This demonstrates how your 67 agents now work together as a true team.
 *
 * Run with:
 *   pnpm run demo:collab
 */

import { createAgentOrchestrator } from "../agents/agent-orchestrator.js";

async function runCollaborationDemo() {
  console.log("🤝 Multi-Agent Collaboration Demo\n");
  console.log("=".repeat(60));

  const orchestrator = createAgentOrchestrator();

  // ========================================
  // SCENARIO: Design OAuth2 Flow
  // ========================================

  console.log("\n📋 SCENARIO: Designing OAuth2 Authentication Flow");
  console.log("Team: Backend Architect, Frontend Architect, Security Engineer");
  console.log("Moderator: CTO");
  console.log("-".repeat(60));

  try {
    // Step 1: Initialize debate
    console.log("\n[1] Initializing team debate...");
    const debateSessionKey = await orchestrator.startTeamDebate({
      topic: "OAuth2 Authentication Architecture",
      agents: [
        {
          id: "backend-architect",
          role: "Backend Lead",
          expertise: "API design, security best practices, token management",
        },
        {
          id: "frontend-architect",
          role: "Frontend Lead",
          expertise: "User experience, OAuth flows, session handling",
        },
        {
          id: "security-engineer",
          role: "Security",
          expertise: "OWASP, threat modeling, PKCE, state validation",
        },
      ],
      moderator: {
        id: "cto",
        role: "CTO (Technical Leadership)",
      },
      context: `
We need to design OAuth2 authentication for a platform supporting:
- Web application (SPA)
- Mobile applications (iOS/Android)
- Desktop applications

Requirements:
- Support multiple providers (Google, GitHub, Microsoft)
- Secure session management
- PKCE support for mobile
- Rate limiting and security considerations
- User experience should be smooth
      `,
    });

    console.log(`✅ Debate initialized: ${debateSessionKey}`);

    // Step 2: Simulate team debate
    console.log("\n[2] Team members present proposals...");
    console.log("-".repeat(60));

    console.log("\n💬 Backend Architect proposes:");
    console.log(`   "I suggest using Authorization Code Flow with PKCE.
   - Endpoint: POST /api/auth/oauth/authorize
   - Callback: GET /api/auth/oauth/callback?code=...&state=...
   - Token exchange: POST /api/auth/oauth/token
   Reasoning: This is the most secure flow for all client types."`);

    console.log("\n💬 Frontend Architect responds:");
    console.log(`   "Good proposal. Question: What about session tokens?
   I need to know:
   - Should I store them in memory or localStorage?
   - What's the refresh token rotation strategy?
   - How do we handle logout across tabs?
   Reasoning: UX depends on these decisions."`);

    console.log("\n💬 Security Engineer challenges:");
    console.log(`   "Before we finalize, we MUST have:
   - PKCE verification (code_challenge + code_verifier)
   - State parameter validation
   - CSRF protection tokens
   - Secure cookie flags (HttpOnly, Secure, SameSite)
   Reasoning: Recent OAuth breaches exploited missing PKCE validation."`);

    console.log("\n💬 Backend Architect revises:");
    console.log(`   "Agreed. I'm adding:
   - PKCE S256 (SHA256) requirement
   - State validation middleware
   - Secure cookie handling
   Updated endpoints will include these."`);

    console.log("\n💬 Frontend Architect agrees:");
    console.log(`   "Perfect. I'll implement:
   - Code verifier generation
   - State parameter tracking
   - Memory-based session storage with refresh logic
   Agreement: This approach works."`);

    console.log("\n✅ CONSENSUS REACHED after 3 rounds of discussion");

    // Step 3: Get debate state
    console.log("\n[3] Reviewing debate state...");
    const state = await orchestrator.getDebateState(debateSessionKey);
    console.log(`   Proposals: ${state.proposals.length}`);
    console.log(`   Challenges: ${state.challenges.length}`);
    console.log(`   Agreements: ${state.agreements.length}`);

    // Step 4: Get final decisions
    console.log("\n[4] Extracting final decisions...");
    const decisions = await orchestrator.getDebateDecisions(debateSessionKey);

    console.log("\n📋 DECISION DOCUMENT:");
    console.log("=".repeat(60));
    for (const decision of decisions) {
      console.log(`\nDecision: ${decision.topic}`);
      if (decision.consensus) {
        console.log(`Final: ${decision.consensus.finalDecision}`);
      }
      console.log(`Proposals from team:`);
      for (const proposal of decision.proposals) {
        console.log(`  - ${proposal.agentId}: ${proposal.reasoning}`);
      }
    }

    // Step 5: Spawn implementation team
    console.log("\n[5] All agree! Now spawning implementation team...");
    console.log("-".repeat(60));

    const implSessionKey = await orchestrator.spawnImplementationTeam({
      debateSessionKey,
      implementationAgents: [
        { id: "backend-architect", role: "API Implementation" },
        { id: "database-engineer", role: "Schema Design" },
        { id: "frontend-architect", role: "UI Implementation" },
        { id: "security-engineer", role: "Security Verification" },
        { id: "testing-specialist", role: "E2E Testing" },
      ],
      label: "OAuth2 Implementation Sprint",
    });

    console.log(`✅ Implementation team spawned: ${implSessionKey}`);

    console.log("\n" + "=".repeat(60));
    console.log("✨ COLLABORATION COMPLETE!");
    console.log("=".repeat(60));

    console.log("\n📊 BENEFITS of this approach:");
    console.log("  ✅ No rework - decisions made upfront");
    console.log("  ✅ All concerns addressed - security, UX, backend");
    console.log("  ✅ Ownership - each team member owns their part");
    console.log("  ✅ Accountability - decisions are documented");
    console.log("  ✅ Alignment - everyone knows the plan");

    console.log("\n🔄 NEXT STEPS:");
    console.log("  1. Backend starts API implementation");
    console.log("  2. Database designs schema in parallel");
    console.log("  3. Frontend builds UI based on API contract");
    console.log("  4. Security reviews implementation");
    console.log("  5. Testing creates comprehensive test suite");
    console.log("  → All with ZERO rework because design was aligned");

    console.log("\n");
  } catch (error) {
    console.error("❌ Demo failed:", error);
    process.exit(1);
  }
}

// Run the demo
runCollaborationDemo().catch(console.error);
