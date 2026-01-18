# NodeCast TV Docker Image
#
# Multi-stage build for FFmpeg with full hardware acceleration support.
# Uses linuxserver/ffmpeg which includes NVENC, VAAPI, and QSV.
#
# Hardware acceleration:
#   - VAAPI (Intel/AMD): Mount /dev/dri and add video/render groups
#   - NVIDIA NVENC: Requires nvidia-container-toolkit on host + --gpus flag
#   - Intel QSV: Mount /dev/dri
#
# Build: docker compose build
# Run with VAAPI: docker run --device /dev/dri:/dev/dri --group-add video ...
# Run with NVENC: docker run --gpus all ...

# Stage 1: Get FFmpeg with all hardware encoders from linuxserver
FROM linuxserver/ffmpeg:latest AS ffmpeg

# Stage 2: Node.js runtime with app
FROM node:20-slim

# Install runtime dependencies for FFmpeg and hardware acceleration
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Build dependencies for better-sqlite3
    python3 \
    make \
    g++ \
    # VAAPI runtime libraries (AMD/Intel)
    libva2 \
    libva-drm2 \
    libvdpau1 \
    mesa-va-drivers \
    # Intel VAAPI/QSV drivers
    intel-media-va-driver \
    i965-va-driver \
    # VA-API utilities for debugging
    vainfo \
    # FFmpeg shared library dependencies
    libx264-164 \
    libx265-199 \
    libfdk-aac2 \
    libvpx7 \
    libmp3lame0 \
    libopus0 \
    libvorbis0a \
    libass9 \
    libfreetype6 \
    libfontconfig1 \
    libssl3 \
    # NVIDIA libraries (for NVENC when using --gpus)
    libnvidia-encode1 \
    && rm -rf /var/lib/apt/lists/* || true

# Copy FFmpeg binaries from linuxserver/ffmpeg
COPY --from=ffmpeg /usr/local/bin/ffmpeg /usr/local/bin/ffmpeg
COPY --from=ffmpeg /usr/local/bin/ffprobe /usr/local/bin/ffprobe

# Verify FFmpeg works and show hardware encoders
RUN ffmpeg -version && ffmpeg -encoders 2>/dev/null | grep -E "vaapi|nvenc|qsv" || echo "Note: HW encoders depend on runtime GPU access"

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create data and cache directories
RUN mkdir -p /app/data /app/transcode-cache && chmod 777 /app/transcode-cache

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server/index.js"]
