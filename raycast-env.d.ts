/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `shepherd` command */
  export type Shepherd = ExtensionPreferences & {}
  /** Preferences accessible in the `add-cow` command */
  export type AddCow = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `shepherd` command */
  export type Shepherd = {}
  /** Arguments passed to the `add-cow` command */
  export type AddCow = {}
}

