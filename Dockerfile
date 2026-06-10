FROM python:3.11-slim

# Install system dependencies needed for PostgreSQL and other packages
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code
COPY backend/ .

# Expose port 7860 (Hugging Face Spaces default port)
EXPOSE 7860

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=7860

# Run collectstatic and start gunicorn binding to port 7860
CMD python manage.py collectstatic --no-input && \
    gunicorn config.wsgi:application --bind 0.0.0.0:7860 --log-file -
