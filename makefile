.PHONY: run-local run-local-debug auth-ecr

auth-ecr:
	aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws

run-local: auth-ecr
	sam build
	sam local start-api --docker-network cmisearch_default

run-local-debug: auth-ecr
	sam build
	sam local start-api --docker-network cmisearch_default --debug-port 5858

