# Hugging Face Spaces Deployment Guide

This guide explains how to deploy the Django backend to Hugging Face Spaces for free.

## Step 1: Create a Space on Hugging Face

1. Go to [huggingface.co/new-space](https://huggingface.co/new-space).
2. Enter a **Space name** (e.g., `mediflow-backend`).
3. Select **Docker** as the SDK.
4. Select **Blank** template.
5. Set Space visibility to **Public** (or Private if you prefer).
6. Click **Create Space**.

---

## Step 2: Add Environment Secrets in Hugging Face

1. Go to your newly created Space.
2. Click on **Settings** tab (gear icon).
3. Scroll down to **Variables and secrets** section.
4. Click **New secret** to add the following variables:
   * **`DATABASE_URL`**: `postgresql://mediflow_db_f89h_user:3xCbipp1Hpm5L8KiZDKKuSoqeqEqzBxa@dpg-d8ktafmrnols73c4elsg-a.oregon-postgres.render.com/mediflow_db_f89h`
   * **`DJANGO_SECRET_KEY`**: `django-insecure-l8xh4lux(a5$ugnqg0(zu6ezvyo41d%+_wxz&hdn^1lr@s_#gj`
   * **`DJANGO_DEBUG`**: `False`
   * **`ALLOWED_HOSTS`**: `*`
   * **`CORS_ALLOWED_ORIGINS`**: `https://mediflow-hms-drab.vercel.app`

---

## Step 3: Deploy/Push the Code to Hugging Face

There are two ways to push the code:

### Method A: Direct Push via Git (Easiest)
1. In your Hugging Face Space page, it will show the Git clone command under "Use Git".
2. Add the Hugging Face Space as a new git remote in your project folder:
   ```bash
   git remote add hf https://huggingface.co/spaces/YOUR_HF_USERNAME/YOUR_SPACE_NAME
   ```
3. Push to Hugging Face (you will need your Hugging Face Token as the password):
   ```bash
   git push --force hf main
   ```

### Method B: GitHub Actions Auto-Sync
If you want GitHub to automatically update Hugging Face on every commit, we can set up a GitHub Action:
1. Create a Write Token on Hugging Face: Go to **Settings > Access Tokens** on Hugging Face and create a token with `Write` role.
2. In your GitHub repository, go to **Settings > Secrets and variables > Actions** and create a new secret named `HF_TOKEN` with your Hugging Face token.
3. Hugging Face will build and start the Docker container automatically!
