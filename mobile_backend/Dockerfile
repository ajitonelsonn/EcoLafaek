FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

# All environment variables in one layer
ENV UV_SYSTEM_PYTHON=1 UV_COMPILE_BYTECODE=1 PYTHONUNBUFFERED=1 \
    AWS_REGION=us-east-1 AWS_DEFAULT_REGION=us-east-1 \
    DOCKER_CONTAINER=1

# Copy requirements file
COPY requirements.txt requirements.txt

# Install dependencies including OpenTelemetry for AWS observability
RUN uv pip install -r requirements.txt && \
    uv pip install aws-opentelemetry-distro>=0.10.1

# Expose ports for AgentCore (8080) and API (8000)
EXPOSE 8080 8000

# Copy entire project
COPY . .

# Use the full module path with OpenTelemetry instrumentation
# This enables AWS X-Ray tracing and CloudWatch metrics for the agent
CMD ["opentelemetry-instrument", "python", "-m", "app"]
