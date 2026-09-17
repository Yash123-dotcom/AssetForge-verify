export function inspectMaterial(text: string) {
  const pipelineScores = { BUILT_IN: 0, URP: 0, HDRP: 0 };
  const shaderNames = Array.from(new Set(Array.from(text.matchAll(/m_ShaderName:\s*([^\r\n]+)/g), (match) => match[1]?.trim() ?? '').filter(Boolean)));
  if (/Universal Render Pipeline|Universal Render Pipeline\/Lit/i.test(text)) pipelineScores.URP += 2;
  if (/HDRP|High Definition Render Pipeline/i.test(text)) pipelineScores.HDRP += 2;
  if (/Standard(?:\s|$)/i.test(text)) pipelineScores.BUILT_IN += 1;
  return { pipelineScores, shaderNames };
}
