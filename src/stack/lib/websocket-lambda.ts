import { ClientWebsocketMessage, ServerWebsocketMessage } from '../../types/websocket';
import { APIGatewayProxyResultV2, APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';
import * as aws from 'aws-sdk';

const connectionTable = process.env.TABLE_CONNECTIONS as string;

const dynamoDb = new aws.DynamoDB.DocumentClient();

interface MonitorInformation {
  MonitorId: string;
  MonitorConnection: string;
  ManagerConnection?: string;
}

async function findMonitorByConnectionId(connectionId: string): Promise<MonitorInformation[]> {
  // Look for items that match the ID
  const results = await dynamoDb.scan({
    TableName: connectionTable,
    ExpressionAttributeNames: {
      '#monCon': 'MonitorConnection',
      '#manCon': 'ManagerConnection',
    },
    ExpressionAttributeValues: {
      ':connId': connectionId,
    },
    FilterExpression: '#monCon = :connId OR #manCon = :connId',
  }).promise();

  if (
    !results.Items ||
    results.Items.length === 0
  ) return [];

  return results.Items as MonitorInformation[];
}

async function sendMessage(
  event: APIGatewayProxyWebsocketEventV2,
  ConnectionId: string,
  message: ServerWebsocketMessage,
): Promise<void> {
  const agManApi = new aws.ApiGatewayManagementApi({
    endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`
  });
  await agManApi.postToConnection({
    ConnectionId,
    Data: JSON.stringify(message),
  }).promise();
}

async function handleLeave(
  event: APIGatewayProxyWebsocketEventV2,
  connections: MonitorInformation[],
  connectionId: string,
) {
  await Promise.all(connections.map(async conn => {
    const promises: Promise<unknown>[] = [];
    if (conn.MonitorConnection === connectionId) {
      // If this connection is to the monitor side, remove the whole item
      promises.push(dynamoDb.delete({
        TableName: connectionTable,
        Key: {
          MonitorId: conn.MonitorId,
        },
      }).promise());

      // Tell the manager that the monitor has left
      if (conn.ManagerConnection) {
        promises.push(sendMessage(
          event,
          conn.ManagerConnection,
          {
            action: 'SetConnected',
            state: false,
          },
        ));
      }
    } else {
      // If this is a manager disconnecting, remove them from the DB
      promises.push(dynamoDb.update({
        TableName: connectionTable,
        Key: {
          MonitorId: conn.MonitorId,
        },
        ExpressionAttributeNames: {
          '#manCon': 'ManagerConnection',
        },
        UpdateExpression: 'REMOVE #manCon',
      }).promise());

      // Let the monitor know
      promises.push(sendMessage(
        event,
        conn.MonitorConnection,
        {
          action: 'SetConnected',
          state: false,
        },
      ));
    }

    await Promise.all(promises);
  }));
}

export async function handler(event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyResultV2> {
  if (event.requestContext.eventType === 'CONNECT') return {
    statusCode: 200,
  };

  const connectionId = event.requestContext.connectionId;
  
  // Get the monitor information associated with the connection
  const connections = await findMonitorByConnectionId(connectionId);

  switch (event.requestContext.eventType) {
    case 'DISCONNECT':
      await handleLeave(
        event,
        connections,
        connectionId,
      );
      break;
    case 'MESSAGE':
      const message = JSON.parse(event.body || '{}') as ClientWebsocketMessage;
      switch (message.action) {
        case 'join': {
          const alreadyConnectedIds = connections.map(c => c.MonitorId);
          const clientType = message.clientType;
          
          // Exit early if this client has already joined with this ID
          if (alreadyConnectedIds.includes(message.id)) break;

          switch (clientType) {
            case 'monitor': {
              // Confirm this is a unique monitor ID
              const existingMonitor = await dynamoDb.get({
                TableName: connectionTable,
                Key: {
                  MonitorId: message.id,
                },
              }).promise();
              if (existingMonitor.Item) {
                await sendMessage(
                  event,
                  connectionId,
                  {
                    action: 'invalid-id',
                  },
                );
                break;
              }

              // Set up the monitor ID in the database
              await dynamoDb.put({
                TableName: connectionTable,
                Item: {
                  MonitorId: message.id,
                  MonitorConnection: connectionId,
                },
              }).promise();
              break;
            }
            case 'manager': {
              // Confirm this is an existing monitor ID without a manager
              const existingMonitor = await dynamoDb.get({
                TableName: connectionTable,
                Key: {
                  MonitorId: message.id,
                },
              }).promise();
              if (
                !existingMonitor.Item ||
                existingMonitor.Item.ManagerConnection
              ) {
                await sendMessage(
                  event,
                  connectionId,
                  {
                    action: 'invalid-id',
                  },
                );
                break;
              }

              const promises: Promise<unknown>[] = [];

              // Add the manager to the connection
              promises.push(dynamoDb.update({
                TableName: connectionTable,
                Key: {
                  MonitorId: message.id,
                },
                ExpressionAttributeNames: {
                  '#manCon': 'ManagerConnection',
                },
                ExpressionAttributeValues: {
                  ':connId': connectionId,
                },
                UpdateExpression: 'SET #manCon = :connId',
              }).promise());

              // Alert the monitor
              promises.push(sendMessage(
                event,
                existingMonitor.Item.MonitorConnection,
                {
                  action: 'SetConnected',
                  state: true,
                },
              ));

              // Alert the manager
              promises.push(sendMessage(
                event,
                connectionId,
                {
                  action: 'SetConnected',
                  state: true,
                },
              ));
              
              await Promise.all(promises);
              break;
            }
          }
        }
        case 'leave': {
          await handleLeave(
            event,
            connections,
            connectionId,
          );
          break;
        }
        default: {
          // Pass the message on to any managed monitors
          const connectionsToSendTo = connections
            .map(conn => conn.ManagerConnection === connectionId
              ? conn.MonitorConnection
              : conn.ManagerConnection
            )
            .filter(s => typeof s !== 'undefined');
          
          await Promise.all(connectionsToSendTo.map(connId => sendMessage(
            event,
            connId,
            message,
          )));
        }
      }
      break;
  }

  return {
    statusCode: 200,
  };
}
