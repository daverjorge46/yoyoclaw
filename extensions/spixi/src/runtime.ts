import { type ExtensionRuntime } from "openclaw/plugin-sdk";

export interface SpixiRuntime extends ExtensionRuntime {
  channel: {
    spixi: {
      sendMessage: (to: string, text: string) => Promise<any>;
      addContact: (address: string) => Promise<any>;
    };
  };
}

let runtime: SpixiRuntime;

export const getSpixiRuntime = () => runtime;
export const setSpixiRuntime = (r: SpixiRuntime) => {
  runtime = r;
};
