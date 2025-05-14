# Makefile

up:        ## Start full stack (Postgres, Redis, Mailpit, Dev Container service)
	docker compose up -d

down:      ## Stop containers
	docker compose down -v

reset:     ## Clean node_modules and build output
	rm -rf node_modules **/node_modules apps/**/dist 