import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deployment } from '../deployments/entities/deployment.entity';
import * as Docker from 'dockerode';
import { getDockerOptions } from '../../shared/docker/docker.util';
import { getRsaKeys } from '../auth/utils/keys';
import { Writable } from 'stream';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3001',
    credentials: true,
  },
  namespace: '/logs',
})
export class LogStreamGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly docker: Docker;
  private readonly logger = new Logger(LogStreamGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(Deployment)
    private readonly deploymentsRepository: Repository<Deployment>,
  ) {
    this.docker = new Docker(getDockerOptions());
  }

  async handleConnection(client: Socket) {
    try {
      this.logger.log(`New WS connection attempt: ${client.id}`);
      let token = client.handshake.query.token as string;
      if (!token && client.handshake.auth) {
        token = client.handshake.auth.token;
      }

      if (!token) {
        this.logger.warn(
          `Connection refused, missing token for client ${client.id}`,
        );
        client.disconnect();
        return;
      }

      const keys = getRsaKeys();
      const payload = await this.jwtService.verifyAsync(token, {
        secret: undefined,
        publicKey: keys.publicKey,
        algorithms: ['RS256'],
      });

      client.data.user = {
        id: payload.sub,
        email: payload.email,
        isAdmin: payload.isAdmin || false, // Check if isAdmin payload exists
      };
      this.logger.log(
        `Authenticated client ${client.id} as User ID: ${client.data.user.id}`,
      );
    } catch (err) {
      this.logger.warn(
        `Authentication failed for client ${client.id}: ${err.message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.cleanupStream(client);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private cleanupStream(client: Socket) {
    if (client.data.logStream) {
      try {
        client.data.logStream.destroy();
        this.logger.log(`Cleaned up log stream for client ${client.id}`);
      } catch (err) {
        this.logger.error(`Error destroying log stream: ${err.message}`);
      }
      client.data.logStream = null;
    }
  }

  @SubscribeMessage('subscribe-logs')
  async handleSubscribeLogs(client: Socket, payload: { deploymentId: string }) {
    this.cleanupStream(client);

    const { deploymentId } = payload;
    const user = client.data.user;

    if (!user) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    try {
      const deployment = await this.deploymentsRepository.findOne({
        where: { id: deploymentId },
        relations: [
          'modelVersion',
          'modelVersion.model',
          'modelVersion.model.user',
        ],
      });

      if (!deployment) {
        client.emit('error', { message: 'Deployment not found' });
        return;
      }

      const model = deployment.modelVersion.model;
      const isOwner = model.user && model.user.id === user.id;
      const isAdmin = user.isAdmin;

      if (!isOwner && !isAdmin) {
        client.emit('error', {
          message: 'Forbidden: You do not own this model',
        });
        return;
      }

      if (!deployment.containerId) {
        client.emit('error', {
          message: 'Container not yet created for this deployment',
        });
        return;
      }

      const container = this.docker.getContainer(deployment.containerId);

      // Verify container exists
      try {
        await container.inspect();
      } catch (err) {
        client.emit('error', {
          message: `Container not found on Docker host: ${err.message}`,
        });
        return;
      }

      this.logger.log(
        `Streaming logs for container ${deployment.containerId} to client ${client.id}`,
      );

      const logStream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        tail: 100,
      });

      client.data.logStream = logStream;

      const stdoutStream = new Writable({
        write(chunk, encoding, callback) {
          client.emit('log-line', {
            stream: 'stdout',
            text: chunk.toString('utf8'),
          });
          callback();
        },
      });

      const stderrStream = new Writable({
        write(chunk, encoding, callback) {
          client.emit('log-line', {
            stream: 'stderr',
            text: chunk.toString('utf8'),
          });
          callback();
        },
      });

      container.modem.demuxStream(logStream, stdoutStream, stderrStream);

      logStream.on('end', () => {
        client.emit('log-end', { message: 'Log stream ended' });
      });

      logStream.on('error', (err) => {
        client.emit('error', { message: `Stream error: ${err.message}` });
      });
    } catch (err) {
      this.logger.error(`Error initializing log stream: ${err.message}`);
      client.emit('error', {
        message: `Internal server error: ${err.message}`,
      });
    }
  }
}
