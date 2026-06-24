import * as Docker from 'dockerode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Resolves the Docker configuration options by dynamically checking for the environment.
 * Prioritizes DOCKER_HOST environment variables, falls back to standard socket files,
 * and automatically detects macOS Colima socket paths if Docker Desktop isn't running.
 *
 * @returns Docker options configured with the correct socket path or connection settings.
 */
export function getDockerOptions(): Docker.DockerOptions {
  if (process.env.DOCKER_HOST) {
    return {};
  }

  if (process.platform === 'win32') {
    return { socketPath: '//./pipe/docker_engine' };
  }

  if (fs.existsSync('/var/run/docker.sock')) {
    return { socketPath: '/var/run/docker.sock' };
  }

  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (homeDir) {
    const colimaSocket = path.join(
      homeDir,
      '.colima',
      'default',
      'docker.sock',
    );
    if (fs.existsSync(colimaSocket)) {
      return { socketPath: colimaSocket };
    }
  }

  return { socketPath: '/var/run/docker.sock' };
}
