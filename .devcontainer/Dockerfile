#######################################################################
# Base image
#######################################################################
FROM node:20-bookworm

#######################################################################
# OS tooling
#######################################################################
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    git=1:2.39.5-0+deb12u2 \
    curl=7.88.1-10+deb12u12 \
    bash=5.2.15-2+b7 \
    libssl-dev=3.0.13-0ubuntu3.5 \
    && rm -rf /var/lib/apt/lists/*

#######################################################################
# Non‑root user (UID 1001 avoids clash with node:20 UID 1000)
#######################################################################
ARG USERNAME=dev
ARG USER_UID=1001
ARG USER_GID=${USER_UID}

RUN groupadd --gid ${USER_GID} ${USERNAME} \
    && useradd  --uid ${USER_UID} --gid ${USER_GID} -m ${USERNAME}

#######################################################################
# pnpm via Corepack
#######################################################################
RUN corepack enable \
    && corepack prepare pnpm@10.10.0 --activate   # same version corepack downloaded before

# make Corepack non‑interactive
ENV CI=true

ENV PNPM_HOME=/home/${USERNAME}/.local/share/pnpm
ENV PATH=${PNPM_HOME}:${PATH}

RUN mkdir -p ${PNPM_HOME} \
    && pnpm config set global-bin-dir ${PNPM_HOME} \
    && pnpm add -g @nestjs/cli create-vite \
    && chown -R ${USERNAME}:${USERNAME} /home/${USERNAME}

#######################################################################
# Default user + workdir
#######################################################################
USER ${USERNAME}
WORKDIR /workspace
# Ensure 'dev' can read secrets mounted into /run/secrets
RUN chown -R ${USERNAME}:${USERNAME} /run/secrets || true
