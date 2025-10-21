FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

# Set environment variables FIRST (needed for uv pip install)
# Base configuration
ENV UV_SYSTEM_PYTHON=1 \
    UV_COMPILE_BYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DOCKER_CONTAINER=1 \
    ENVIRONMENT=production

# Copy requirements file
COPY requirements.txt requirements.txt

# Install dependencies including OpenTelemetry for AWS observability
RUN uv pip install -r requirements.txt && \
    uv pip install aws-opentelemetry-distro>=0.10.1

# Expose ports for AgentCore (8080) and API (8000)
EXPOSE 8080 8000

# Copy entire project
COPY . .

# AWS Configuration
ENV AWS_REGION=us-east-1 \
    AWS_DEFAULT_REGION=us-east-1 \
    BEDROCK_MODEL_ID=amazon.nova-pro-v1:0

# Database Configuration (TiDB Cloud)
ENV DB_HOST="your-db-host.tidbcloud.com" \
    DB_NAME="your_database_name" \
    DB_USER="your_db_user" \
    DB_PASSWORD="your_db_password" \
    DB_PORT="4000"

# S3 Configuration
ENV S3_BUCKET_NAME=your_s3_bucket_name

# AWS Credentials - Using IAM Role from AgentCore execution role
# AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are provided by the execution role

# JWT Configuration
ENV JWT_SECRET=your_jwt_secret_key_here \
    JWT_EXPIRATION_HOURS=24

# CORS Configuration
ENV ALLOWED_ORIGINS="*"

# Use the full module path with OpenTelemetry instrumentation
# This enables AWS X-Ray tracing and CloudWatch metrics for the agent
CMD ["opentelemetry-instrument", "python", "-m", "app"]
