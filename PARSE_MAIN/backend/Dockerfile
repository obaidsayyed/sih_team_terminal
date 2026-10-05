FROM python:3.12-slim

# Install system dependencies, specifically tshark (Wireshark)
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y tshark && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Command to run the application using uvicorn
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
