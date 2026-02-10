# Vectra CLI Command Reference

## Core

```bash
node vectra.mjs --help
node vectra.mjs status
node vectra.mjs nodes
node vectra.mjs overmind
node vectra.mjs desktop
```

## Workspace + node creation

```bash
node vectra.mjs init [name]
node vectra.mjs node <name>
```

## Sync + work-claims

```bash
node vectra.mjs sync
node vectra.mjs work list
node vectra.mjs work claim "<task summary>"
node vectra.mjs work release
```

## Workflow session lifecycle

```bash
node vectra.mjs workflow start --summary "<task>" --agent "<name>" --difficulty <low|medium|high>
node vectra.mjs workflow update --id <SESSION_ID> --progress <0-100> --phase <phase>
node vectra.mjs workflow checkpoint --id <SESSION_ID> -m "<milestone>" -p <0-100>
node vectra.mjs workflow end --id <SESSION_ID> --status <completed|failed|cancelled> --summary "<summary>"
node vectra.mjs workflow list
node vectra.mjs workflow stats
```

## Startup behavior (Windows)

```bash
node vectra.mjs startup --help
```
