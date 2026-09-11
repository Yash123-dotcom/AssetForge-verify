import { load } from 'cheerio';
import { AssetListingAnalysis, Pipeline, UnityVersion } from '../types/verify.types.js';

const clean = (value?: string | null) => value?.replace(/\s+/g, ' ').trim() || null;
const normalizeUnity = (raw: string | null): UnityVersion | null => { const match = raw?.match(/(?:^|\D)(2021|2022|2023|6000)(?:\D|$)/); return match?.[1] as UnityVersion | null ?? null; };
const afterLabel = (text: string, label: string, pattern: string) => clean(text.match(new RegExp(`${label}\\s*(${pattern})`, 'i'))?.[1]);

export function parseUnityAssetStore(html: string, url: string): AssetListingAnalysis {
  const $ = load(html); const pageText = $('body').text().replace(/\s+/g, ' ').trim();
  const jsonLd = $('script[type="application/ld+json"]').map((_, el) => { try { return JSON.parse($(el).text()) as Record<string, unknown>; } catch { return null; } }).get().find(Boolean) as Record<string, unknown> | undefined;
  const title = clean($('h1').first().text()) ?? clean($('meta[property="og:title"]').attr('content'))?.split('|')[0]?.trim() ?? null;
  const ogTitle = clean($('meta[property="og:title"]').attr('content'));
  const description = clean($('meta[property="og:description"]').attr('content')) ?? clean(typeof jsonLd?.description === 'string' ? jsonLd.description : null);
  const publisher = clean(typeof jsonLd?.brand === 'object' && jsonLd.brand && 'name' in jsonLd.brand ? String((jsonLd.brand as { name: unknown }).name) : null);
  const pipelineSupport: Pipeline[] = [];
  const pipelineColumns: Array<[Pipeline, string]> = [['BUILT_IN','Built-in'],['URP','URP'],['HDRP','HDRP']];
  $('table').each((_, table) => { const headers = $(table).find('tr').first().find('th,td').map((__, cell) => clean($(cell).text()) ?? '').get(); $(table).find('tr').slice(1).each((__, row) => { const cells = $(row).find('th,td').map((___, cell) => clean($(cell).text()) ?? '').get(); pipelineColumns.forEach(([key,label]) => { const index = headers.findIndex((header) => header.toLowerCase().includes(label.toLowerCase())); if (index >= 0 && /^compatible$/i.test(cells[index] ?? '') && !pipelineSupport.includes(key)) pipelineSupport.push(key); }); }); });
  if (!pipelineSupport.length) { const scoped = `${title ?? ''} ${description ?? ''}`; if (/\b(?:Universal Render Pipeline|URP)\b/i.test(scoped)) pipelineSupport.push('URP'); if (/\b(?:High Definition Render Pipeline|HDRP)\b/i.test(scoped)) pipelineSupport.push('HDRP'); if (/\b(?:Built-in Render Pipeline|Built-in)\b/i.test(scoped)) pipelineSupport.push('BUILT_IN'); }
  const rawUnity = afterLabel(pageText, 'Original Unity version', '(?:2021|2022|2023|6000)(?:\\.[0-9A-Za-z]+)*');
  const dependencyEvidence = `${pageText} ${description ?? ''}`;
  const dependencyNames = ['Cinemachine', 'TextMeshPro', 'DOTween', 'Input System'].filter((name) => new RegExp(`\\b${name.replace(' ', '\\s+')}\\b`, 'i').test(dependencyEvidence));
  const shaderText = `${title ?? ''} ${description ?? ''}`;
  const customShaders = /\b(?:custom shaders?|shaders? included|Shader Graph|shader package|custom materials?\/shaders?)\b/i.test(shaderText) ? true : /\b(?:no custom shaders?|does not use custom shaders?)\b/i.test(shaderText) ? false : 'UNKNOWN';
  return { source: 'UNITY_ASSET_STORE', url, assetName: title, publisherName: publisher, category: ogTitle?.split('|')[1]?.trim() || null, unityVersion: normalizeUnity(rawUnity), pipelineSupport, dependencies: dependencyNames, customShaders, platforms: ['Windows','macOS','Android','iOS','WebGL'].filter((platform) => new RegExp(`\\b${platform}\\b`, 'i').test(description ?? '')), latestUpdate: afterLabel(pageText, 'Latest release date', '[A-Z][a-z]{2} \\d{1,2}, \\d{4}'), description, packageVersion: afterLabel(pageText, 'Latest version', '[0-9]+(?:\\.[0-9A-Za-z]+)+'), confidence: { unityVersion: rawUnity ? 'HIGH' : 'LOW', pipeline: pipelineSupport.length ? ($('table').length ? 'HIGH' : 'MEDIUM') : 'LOW', dependencies: dependencyNames.length ? 'MEDIUM' : 'LOW', shaders: customShaders === 'UNKNOWN' ? 'LOW' : 'MEDIUM' } };
}
