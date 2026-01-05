/**
 * Client-Safe HTTP Method Enum
 * 
 * This enum matches the server-side HttpMethod enum
 * and can be safely used in client components.
 */

export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  PATCH = "PATCH",
  DELETE = "DELETE"
}

