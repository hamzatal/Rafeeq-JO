import { ChatThread } from '@rafeeq/ui';
import { api } from '../../src/lib/api';

/**
 * The trip chat lives in `@rafeeq/ui` — the two apps' copies were byte-identical.
 * All that differs is the api client, which carries this app's token storage key.
 */
export default function Chat() {
  return <ChatThread api={api} />;
}
