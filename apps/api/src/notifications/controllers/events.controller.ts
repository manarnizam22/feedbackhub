import { Controller, Query, Sse, UnauthorizedException, type MessageEvent } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import type { Notification } from '@feedbackhub/types';

import { Public } from '../../auth/public.decorator.js';
import { verifyAccessToken } from '../../auth/verify-token.js';
import { eventBus, type CommittedMutation } from '../../common/event-bus.js';

/* SSE cannot send an Authorization header, so this route is @Public() at the
   guard and does its own verification of the SAME Keycloak JWT passed as
   ?access_token= (shared verify path — see docs/rules/security.md, "SSE
   exception"). Broadcast change events go to every listener; notification
   events only to their recipient. A comment ping every 25s keeps proxies from
   closing idle streams. */
@ApiTags('events')
@Controller()
export class EventsController {
  @Public()
  @Sse('events')
  @ApiOperation({ summary: 'Live change + notification stream (SSE)' })
  events(@Query('access_token') accessToken?: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      let closed = false;
      const start = async () => {
        const user = await verifyAccessToken(accessToken ?? '');
        if (!user) {
          subscriber.error(new UnauthorizedException('Invalid token'));
          return;
        }
        const onChange = (event: CommittedMutation) => {
          subscriber.next({ data: event });
        };
        const onNotification = (payload: { userId: string; notification: Notification }) => {
          if (payload.userId === user.id) {
            subscriber.next({ data: { kind: 'notification', notification: payload.notification } });
          }
        };
        const ping = setInterval(() => subscriber.next({ data: { kind: 'ping' } }), 25_000);
        eventBus.on('change', onChange);
        eventBus.on('notification', onNotification);
        if (closed) {
          clearInterval(ping);
          eventBus.off('change', onChange);
          eventBus.off('notification', onNotification);
          return;
        }
        cleanup = () => {
          clearInterval(ping);
          eventBus.off('change', onChange);
          eventBus.off('notification', onNotification);
        };
      };
      let cleanup = () => {
        closed = true;
      };
      void start();
      return () => cleanup();
    });
  }
}
