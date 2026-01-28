import { Type } from "@sinclair/typebox";

import { NonEmptyString } from "./primitives.js";

export const ScreenContextUpdateParamsSchema = Type.Object(
  {
    sessionKey: NonEmptyString,
    app: Type.Union([Type.String(), Type.Null()]),
    title: Type.Union([Type.String(), Type.Null()]),
    text: Type.Union([Type.String(), Type.Null()]),
    timestamp: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);

export const ScreenContextGetParamsSchema = Type.Object(
  {
    sessionKey: NonEmptyString,
  },
  { additionalProperties: false },
);

export type ScreenContextUpdateParams = {
  sessionKey: string;
  app: string | null;
  title: string | null;
  text: string | null;
  timestamp: number;
};

export type ScreenContextGetParams = {
  sessionKey: string;
};

export type ScreenContextData = {
  app: string | null;
  title: string | null;
  text: string | null;
  timestamp: number;
  updatedAt: number;
};
