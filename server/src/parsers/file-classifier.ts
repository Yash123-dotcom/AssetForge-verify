import { extname, basename } from 'node:path';
import { DeepScanCategory } from '../types/deep-scan.types.js';

const textureExtensions = new Set(['.png', '.jpg', '.jpeg', '.tga', '.psd', '.exr', '.tif', '.tiff']);
const modelExtensions = new Set(['.fbx', '.obj', '.blend', '.dae']);
const audioExtensions = new Set(['.wav', '.mp3', '.ogg', '.aiff']);

export function classifyDeepScanFile(path: string): DeepScanCategory {
  const lower = path.toLowerCase();
  const extension = extname(lower);
  const name = basename(lower);
  if (extension === '.cs') return 'SCRIPT';
  if (['.shader', '.shadergraph', '.hlsl', '.cginc', '.compute'].includes(extension)) return 'SHADER';
  if (extension === '.mat') return 'MATERIAL';
  if (textureExtensions.has(extension)) return 'TEXTURE';
  if (extension === '.prefab') return 'PREFAB';
  if (extension === '.unity') return 'SCENE';
  if (modelExtensions.has(extension)) return 'MODEL';
  if (audioExtensions.has(extension)) return 'AUDIO';
  if (extension === '.md' || extension === '.txt' || /^(readme|install|setup|documentation)(\.|$)/i.test(name) || /(^|\/)docs?(\/|$)/i.test(lower)) return 'DOCUMENTATION';
  if (extension === '.asmdef' || extension === '.json' || name === 'package.json' || name === 'manifest.json') return 'PACKAGE_METADATA';
  return 'OTHER';
}

export function isBoundedTextCategory(category: DeepScanCategory, extension: string): boolean {
  return ['SCRIPT', 'SHADER', 'MATERIAL', 'DOCUMENTATION', 'PACKAGE_METADATA'].includes(category) || extension === '.meta';
}
