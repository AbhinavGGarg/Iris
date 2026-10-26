import { useEffect, useRef } from "react";

/**
 * ElevenLabs no longer lets the app replace an agent's first message when a call
 * starts ("Override for field 'first_message' is not allowed"), but it still lets
 * us replace the prompt. So the opening line rides inside the prompt, and once the
 * call is connected the app sends one game event that tells the buddy to say it.
 */
export const OPENING_EVENT = "[GAME EVENT] Begin";

export function withOpeningLine(prompt: string, line: string): string {
  return `${prompt}

# OPENING LINE
The very first message you get is "${OPENING_EVENT}". It comes from the game, not the child. Reply to it by saying exactly this, word for word, and nothing else:
"${line}"`;
}

/**
 * Call the returned function right before startSession. When the call connects,
 * the opening event is sent once.
 */
export function useOpeningLine(status: string, sendUserMessage: (text: string) => void) {
  const pending = useRef(false);
  const send = useRef(sendUserMessage);
  useEffect(() => {
    send.current = sendUserMessage;
  });
  useEffect(() => {
    if (status === "connected" && pending.current) {
      pending.current = false;
      send.current(OPENING_EVENT);
    }
    if (status === "disconnected") pending.current = false;
  }, [status]);
  return () => {
    pending.current = true;
  };
}
