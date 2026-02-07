/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as drivers from "../drivers.js";
import type * as follows from "../follows.js";
import type * as h2h from "../h2h.js";
import type * as leaderboards from "../leaderboards.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_scoring from "../lib/scoring.js";
import type * as predictions from "../predictions.js";
import type * as races from "../races.js";
import type * as results from "../results.js";
import type * as seed from "../seed.js";
import type * as testing from "../testing.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  drivers: typeof drivers;
  follows: typeof follows;
  h2h: typeof h2h;
  leaderboards: typeof leaderboards;
  "lib/auth": typeof lib_auth;
  "lib/scoring": typeof lib_scoring;
  predictions: typeof predictions;
  races: typeof races;
  results: typeof results;
  seed: typeof seed;
  testing: typeof testing;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
