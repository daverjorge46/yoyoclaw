.PHONY: bot-start bot-stop bot-restart bot-restart-app bot-status bot-health \
	start stop restart restart-app status health \
	install build rebuild lint format test test-coverage dev pipeline

bot-start:
	./scripts/start-mac.sh

bot-stop:
	./scripts/stop-mac.sh

# CLI gateway restart (default: works without Swift/Xcode)
bot-restart:
	./scripts/restart-cli.sh

# macOS app restart (requires Xcode - blocked by Swift 6.2.3 bug)
bot-restart-app:
	./scripts/restart-mac.sh

bot-status:
	pnpm clawdis status

bot-health:
	pnpm clawdis gateway health

# Convenience aliases
start: bot-start
stop: bot-stop
restart: bot-restart
restart-app: bot-restart-app
status: bot-status
health: bot-health

# Common pipeline commands
install:
	pnpm install

build:
	pnpm build

rebuild: build

lint:
	pnpm lint

format:
	pnpm format

test:
	pnpm test

test-coverage:
	pnpm test:coverage

dev:
	pnpm dev

pipeline: install lint test build
