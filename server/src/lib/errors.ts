export class NotFoundError extends Error { readonly code = 'REPORT_NOT_FOUND'; }
export class PersistenceError extends Error { readonly code = 'INTERNAL_ERROR'; }
export class AssetFetchTimeoutError extends Error { readonly code = 'ASSET_FETCH_TIMEOUT'; }
export class DeepScanError extends Error {
  constructor(readonly code: string, message: string, readonly status = 422) { super(message); }
}
export class ServiceError extends Error {
  constructor(readonly code: string, message: string, readonly status = 400) { super(message); }
}
