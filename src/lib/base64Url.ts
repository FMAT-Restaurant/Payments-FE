/** Base64url encoding of a JSON value (JWT segments). Only used to build unsigned demo and test tokens. */
export const base64UrlJson = (value: object): string =>
  btoa(JSON.stringify(value)).replaceAll('=', '').replaceAll('+', '-').replaceAll('/', '_')
