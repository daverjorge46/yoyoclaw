#!/usr/bin/env tsx

/**
 * Run Bot Simulation
 *
 * Demonstrates true emergence through chaotic dynamics by simulating 10 bots
 * with identical initial conditions that develop completely different souls.
 */

import { runBotSimulation } from '../apps/web/src/lib/soul/integrated-bot-simulation'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

async function main() {
  const report = await runBotSimulation(10)

  // Write report to file
  const reportPath = join(process.cwd(), 'BOT_SIMULATION_REPORT.md')
  writeFileSync(reportPath, report, 'utf-8')

  console.log(`\n📝 Report written to: ${reportPath}\n`)
}

main().catch(console.error)
