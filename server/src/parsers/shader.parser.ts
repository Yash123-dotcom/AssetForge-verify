export function inspectShader(text: string, path: string) {
  const findings: string[] = [];
  const technologies: string[] = [];
  const pipelineScores = { BUILT_IN: 0, URP: 0, HDRP: 0 };
  if (/UniversalRenderPipeline|UniversalPipeline|render-pipelines\.universal|ShaderLibrary\/Core\.hlsl/i.test(text)) pipelineScores.URP += 2;
  if (/HDRenderPipeline|HighDefinition|render-pipelines\.high-definition/i.test(text)) pipelineScores.HDRP += 2;
  if (/\bCGPROGRAM\b|UnityCG\.cginc/i.test(text)) { pipelineScores.BUILT_IN += 1; technologies.push('Legacy CG'); findings.push('Legacy CG shader syntax detected.'); }
  if (/\bStandard\b/.test(text) && /Shader\s+"/i.test(text)) pipelineScores.BUILT_IN += 1;
  if (path.toLowerCase().endsWith('.shadergraph')) technologies.push('Shader Graph');
  else technologies.push('Custom Shader');
  if (/\b#include\s+["<](?!Packages\/com\.unity)/i.test(text)) findings.push('Custom shader includes detected.');
  return { pipelineScores, technologies, findings };
}
