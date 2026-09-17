export class NotFoundError extends Error { readonly code = 'REPORT_NOT_FOUND'; }
export class PersistenceError extends Error { readonly code = 'INTERNAL_ERROR'; }
export class AssetFetchTimeoutError extends Error { readonly code = 'ASSET_FETCH_TIMEOUT'; }
