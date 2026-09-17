import { Request, Response } from 'express';
import { AssetFetchTimeoutError, PersistenceError } from '../lib/errors.js';
import { analyzeAssetUrl } from '../services/asset-analysis.service.js';
import { assetUrlBodySchema, UnsupportedAssetUrlError } from '../validators/asset-url.validator.js';

export async function analyzeAsset(request: Request, response: Response): Promise<void> {
  const body = assetUrlBodySchema.safeParse(request.body);
  if (!body.success) {
    response.locals.errorCode = 'INVALID_ASSET_URL';
    response.status(400).json({ code: 'INVALID_ASSET_URL', error: body.error.issues[0]?.message ?? 'Invalid URL.' });
    return;
  }
  try {
    const analysis = await analyzeAssetUrl(body.data.url);
    const partial = !analysis.unityVersion || !analysis.pipelineSupport.length;
    response.json({ analysis, ...(partial ? { code: 'ASSET_PARSE_PARTIAL' } : {}) });
  } catch (error) {
    if (error instanceof TypeError) { response.locals.errorCode = 'INVALID_ASSET_URL'; response.status(400).json({ code: 'INVALID_ASSET_URL', error: error.message }); }
    else if (error instanceof UnsupportedAssetUrlError) { response.locals.errorCode = 'UNSUPPORTED_DOMAIN'; response.status(422).json({ code: 'UNSUPPORTED_DOMAIN', error: error.message }); }
    else if (error instanceof AssetFetchTimeoutError) { response.locals.errorCode = 'ASSET_FETCH_TIMEOUT'; response.status(504).json({ code: 'ASSET_FETCH_TIMEOUT', error: error.message }); }
    else if (error instanceof PersistenceError) { response.locals.errorCode = 'ASSET_PARSE_FAILED'; response.status(502).json({ code: 'ASSET_PARSE_FAILED', error: error.message }); }
    else { response.locals.errorCode = 'INTERNAL_ERROR'; response.status(500).json({ code: 'INTERNAL_ERROR', error: 'Asset analysis failed.' }); }
  }
}
