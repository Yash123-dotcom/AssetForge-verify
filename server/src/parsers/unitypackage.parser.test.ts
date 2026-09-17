import { createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip, gzipSync } from 'node:zlib';
import { pack } from 'tar-stream';
import { afterEach, describe, expect, it } from 'vitest';
import { parseUnityPackage } from './unitypackage.parser.js';

const temporaryDirectories: string[] = [];

async function packageFixture(entries: Array<{ path: string; content: string | Buffer }>): Promise<{ path: string; size: number }> {
  const directory = await mkdtemp(join(tmpdir(), 'assetforge-parser-test-')); temporaryDirectories.push(directory);
  const output = join(directory, 'fixture.unitypackage'); const archive = pack();
  const writing = pipeline(archive, createGzip(), createWriteStream(output));
  entries.forEach((entry, index) => {
    const guid = String(index + 1).padStart(32, '0');
    archive.entry({ name: `${guid}/pathname` }, entry.path);
    archive.entry({ name: `${guid}/asset` }, entry.content);
    archive.entry({ name: `${guid}/asset.meta` }, 'fileFormatVersion: 2\ntimeCreated: 2022.3.10f1');
  });
  archive.finalize(); await writing;
  const { stat } = await import('node:fs/promises');
  return { path: output, size: (await stat(output)).size };
}

afterEach(async () => { await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

describe('Unity package static parser', () => {
  it('detects URP, scripts, shaders, dependencies, docs, asmdefs, and DLLs without executing content', async () => {
    const fixture = await packageFixture([
      { path: 'Assets/Scripts/CameraRig.cs', content: 'using UnityEngine.Rendering.Universal; using Cinemachine; #if UNITY_EDITOR\nusing UnityEditor;\n#endif' },
      { path: 'Assets/Shaders/Water.shadergraph', content: '{"target":"UniversalRenderPipeline","package":"com.unity.render-pipelines.universal"}' },
      { path: 'Packages/package.json', content: '{"dependencies":{"com.unity.cinemachine":"3.0.0","com.unity.render-pipelines.universal":"17.0.0"}}' },
      { path: 'Assets/Runtime/Core.asmdef', content: '{"references":["Unity.Cinemachine"]}' },
      { path: 'Assets/Plugins/Native.dll', content: Buffer.from([0x4d, 0x5a, 0x00, 0x00]) },
      { path: 'README.md', content: '# Setup\nInstall URP before importing.' },
    ]);
    const { result } = await parseUnityPackage(fixture.path, 'fixture.unitypackage', fixture.size);
    expect(result.composition).toMatchObject({ scripts: 1, shaders: 1, documentationFiles: 1 });
    expect(result.detected.pipelineSignals).toContain('URP');
    expect(result.detected.dependencies).toContain('Cinemachine');
    expect(result.detected).toMatchObject({ documentationPresent: true, asmdefPresent: true, dllPresent: true });
    expect(result.detected.findings).toContain('UnityEditor references detected.');
  });

  it('keeps mixed URP and HDRP evidence explicit', async () => {
    const fixture = await packageFixture([
      { path: 'Assets/URP.cs', content: 'using UnityEngine.Rendering.Universal;' },
      { path: 'Assets/HDRP.cs', content: 'using UnityEngine.Rendering.HighDefinition;' },
    ]);
    const { result } = await parseUnityPackage(fixture.path, 'mixed.unitypackage', fixture.size);
    expect(result.detected.pipelineSignals).toEqual(expect.arrayContaining(['URP', 'HDRP']));
  });

  it('detects Built-in only from combined legacy signals', async () => {
    const fixture = await packageFixture([{ path: 'Assets/Legacy.shader', content: 'Shader "Example/Standard" { SubShader { Pass { CGPROGRAM\n#include "UnityCG.cginc"\nENDCG } } }' }]);
    const { result } = await parseUnityPackage(fixture.path, 'builtin.unitypackage', fixture.size);
    expect(result.detected.pipelineSignals).toContain('BUILT_IN');
  });

  it('reports missing docs and malformed metadata without crashing', async () => {
    const fixture = await packageFixture([{ path: 'Packages/package.json', content: '{not-json' }, { path: 'Assets/Texture.png', content: Buffer.from([1, 2, 3]) }]);
    const { result } = await parseUnityPackage(fixture.path, 'malformed.unitypackage', fixture.size);
    expect(result.detected.documentationPresent).toBe(false);
    expect(result.detected.findings).toContain('Malformed package metadata was ignored.');
  });

  it('rejects a corrupted gzip package', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'assetforge-parser-test-')); temporaryDirectories.push(directory);
    const path = join(directory, 'corrupt.unitypackage');
    const { writeFile } = await import('node:fs/promises'); await writeFile(path, gzipSync('not a tar archive'));
    await expect(parseUnityPackage(path, 'corrupt.unitypackage', 30)).rejects.toMatchObject({ code: 'ARCHIVE_EXTRACTION_FAILED' });
  });
});
