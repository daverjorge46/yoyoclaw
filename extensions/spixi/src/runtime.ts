import { type ExtensionRuntime } from "openclaw/plugin-sdk";
import axios from "axios";

export interface SpixiRuntime extends ExtensionRuntime {
  channel: {
    spixi: {
      sendMessage: (to: string, text: string) => Promise<any>;
      addContact: (address: string) => Promise<any>;
    };
  };
}

let runtime: SpixiRuntime;

export const getSpixiRuntime = () => {
  if (!runtime) {
    // Basic fallback implementation for QuIXI API
    return {
      channel: {
        spixi: {
          sendMessage: async (to: string, text: string) => {
            try {
              const res = await axios.post("http://localhost:8001/sendChatMessage", {
                address: to,
                message: text,
                channel: "0"
              });
              return res.data;
            } catch (e: any) {
              throw new Error(`Spixi send failed: ${e.message}`);
            }
          },
          addContact: async (address: string) => {
            try {
              const res = await axios.post("http://localhost:8001/addContact", {
                address: address
              });
              return res.data;
            } catch (e: any) {
              throw new Error(`Spixi addContact failed: ${e.message}`);
            }
          }
        }
      }
    } as any;
  }
  return runtime;
};

export const setSpixiRuntime = (r: SpixiRuntime) => {
  runtime = r;
};
