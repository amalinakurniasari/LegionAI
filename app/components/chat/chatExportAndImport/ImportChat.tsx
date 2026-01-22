import type { Message } from 'ai';
import { toast } from 'react-toastify';
import { IconButton } from '~/components/ui/IconButton';
import { classNames } from '~/utils/classNames';

type ChatData = {
  messages?: Message[]; // Standard Bolt format
  description?: string; // Optional description
};

export function ImportChat(importChat: ((description: string, messages: Message[]) => Promise<void>) | undefined) {
  return (
      <>
          <input
              type="file"
              id="chat-import"
              className="hidden"
              accept=".json"
              onChange={async (e) => {
                  const file = e.target.files?.[0];

                  if (file && importChat) {
                      try {
                          const reader = new FileReader();

                          reader.onload = async (e) => {
                              try {
                                  const content = e.target?.result as string;
                                  const data = JSON.parse(content) as ChatData;

                                  // Standard format
                                  if (Array.isArray(data.messages)) {
                                      await importChat(data.description || 'Imported Chat', data.messages);
                                      toast.success('Chat imported successfully');

                                      return;
                                  }

                                  toast.error('Invalid chat file format');
                              } catch (error: unknown) {
                                  if (error instanceof Error) {
                                      toast.error('Failed to parse chat file: ' + error.message);
                                  } else {
                                      toast.error('Failed to parse chat file');
                                  }
                              }
                          };
                          reader.onerror = () => toast.error('Failed to read chat file');
                          reader.readAsText(file);
                      } catch (error) {
                          toast.error(error instanceof Error ? error.message : 'Failed to import chat');
                      }
                      e.target.value = ''; // Reset file input
                  } else {
                      toast.error('Something went wrong');
                  }
              }}
          />
          <IconButton
              onClick={() => {
                  const input = document.getElementById('chat-import');
                  input?.click();
              }}
              size="sm"
              title='Import Chat'
              className={classNames(
                  'transition-all flex items-center gap-1 px-1.5',
                  'bg-bolt-elements-item-backgroundDefault text-bolt-elements-item-contentDefault'
              )}
          >
              <div className="i-ph:download-simple text-xl" />
          </IconButton>
      </>
  );
}
