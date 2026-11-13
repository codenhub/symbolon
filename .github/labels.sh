#!/bin/sh
# The repository's issue labels, created or updated on GitHub through `gh`. Run
# from the repository root; CONTRIBUTING.md has the command for each shell.
#
# Each line is `label <name> <color> <description>`. A label no longer listed is
# never deleted, because deleting one strips it from every issue that carries it.
set -eu

label() {
  gh label create "$1" --color "$2" --description "$3" --force
}

label type:bug d73a4a "Something does not work as documented"
label type:feature a2eeef "New functionality or a change to existing behavior"
label type:security b60205 "Hardening, or a fix for a disclosed vulnerability"
label type:docs 0075ca "Documentation only"
label type:chore cfd3d7 "Tooling, CI, dependencies, or repository upkeep"
label pkg:core c5def5 "packages/core"
label pkg:server c5def5 "packages/server"
label pkg:store c5def5 "packages/store and the store adapters"
label app:node bfdadc "apps/node and the Docker image"
label app:workers bfdadc "apps/workers and the Workers template"
label app:dashboard bfdadc "apps/dashboard"
label upstream 5319e7 "Needs a change in an @codenhub package first"
label status:needs-triage fbca04 "Not yet reviewed by a maintainer"
label status:blocked d93f0b "Waiting on another issue, release, or decision"
