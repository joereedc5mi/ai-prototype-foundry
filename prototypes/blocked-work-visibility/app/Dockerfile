# Use Chainguard's secure Python image
FROM cgr.dev/chainguard/python:latest-dev

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Run the application
# We use uvicorn to serve the FastAPI app
ENTRYPOINT ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
