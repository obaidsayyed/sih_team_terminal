FROM python:3.12-slim

# Force Python output to not be buffered
ENV PYTHONUNBUFFERED=1
# Set the port explicitly
ENV PORT=10000

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

# Expose the port Render expects
EXPOSE 10000

# Command to run the application using uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
