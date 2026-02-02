# Sandbox container for Git operations
# This container provides Git and Node.js for Apps Script modifications

FROM node:20-bullseye-slim

# Install required packages
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create workspace directory
WORKDIR /workspace

# Set up Git configuration
RUN git config --global user.email "agent@home-remodel-budget.workers.dev" && \
    git config --global user.name "Home Remodel Budget Agent"

# Keep the container running
CMD ["tail", "-f", "/dev/null"]
