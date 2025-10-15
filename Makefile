.PHONY: help build up down logs clean dev prod

# Default target
help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Build the Docker image
	docker-compose build

up: ## Start the application
	docker-compose up -d

down: ## Stop the application
	docker-compose down

logs: ## Show application logs
	docker-compose logs -f

clean: ## Clean up containers and images
	docker-compose down -v --rmi all

dev: ## Start in development mode
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

prod: ## Start in production mode with nginx
	docker-compose --profile proxy up -d

restart: ## Restart the application
	docker-compose restart

status: ## Show container status
	docker-compose ps

shell: ## Open shell in frontend container
	docker-compose exec frontend sh
