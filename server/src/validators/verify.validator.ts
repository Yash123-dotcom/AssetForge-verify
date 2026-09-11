import { z } from 'zod';
import { PIPELINES, PLATFORMS, UNITY_VERSIONS } from '../types/verify.types.js';

const cleanDependency = z.string().trim().min(1, 'Dependencies cannot be empty').max(80, 'Dependency names must be 80 characters or fewer');

export const verifyRequestSchema = z.object({
  project: z.object({
    unityVersion: z.enum(UNITY_VERSIONS),
    pipeline: z.enum(PIPELINES),
    platform: z.enum(PLATFORMS),
  }).strict(),
  asset: z.object({
    testedUnityVersion: z.enum(UNITY_VERSIONS),
    pipeline: z.enum(PIPELINES),
    customShaders: z.boolean(),
    dependencies: z.array(cleanDependency).max(30, 'A maximum of 30 dependencies is supported'),
    metadata: z.object({ assetName: z.string().trim().max(200).optional(), publisherName: z.string().trim().max(200).optional(), sourceUrl: z.url().max(2048).optional(), source: z.literal('UNITY_ASSET_STORE').optional(), metadataSource: z.enum(['URL_ANALYSIS', 'MANUAL']).optional() }).strict().optional(),
  }).strict(),
}).strict();
