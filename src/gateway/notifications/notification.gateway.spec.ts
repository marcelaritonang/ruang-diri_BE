import { Test } from '@nestjs/testing';
import { NotificationGateway } from './notification.gateway';
import { INestApplication } from '@nestjs/common';
import { Socket, io } from 'socket.io-client';

async function createNestApp(...gateways: any): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
    providers: gateways,
  }).compile();
  return testingModule.createNestApplication();
}

describe('NotificationGateway', () => {
  let gateway: NotificationGateway;
  let app: INestApplication;
  let ioClient: Socket;

  beforeAll(async () => {
    app = await createNestApp(NotificationGateway);
    gateway = app.get<NotificationGateway>(NotificationGateway);
    ioClient = io('http://localhost:3000', {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });

    app.listen(3000);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
