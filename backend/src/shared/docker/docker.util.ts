import * as Docker from 'dockerode';
import * as fs from 'fs';
import * as path from 'path';

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
