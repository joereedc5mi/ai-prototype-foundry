# Stage 1: Build the React frontend
FROM node:22 AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Serve with FastAPI
FROM cgr.dev/chainguard/python:latest-dev
WORKDIR /app

# Install backend dependencies
COPY app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY app/ .

# Copy frontend build from Stage 1
COPY --from=frontend-builder /frontend/dist ./frontend/dist

# Run the application
ENTRYPOINT ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
