export function RecommendationList({ recommendations }: { recommendations: string[] }) {
  const items = recommendations.length ? recommendations : ['Keep a backup or Git branch before importing third-party packages.'];
  return <section className="recommendations"><p className="eyebrow">RECOMMENDATIONS</p><h2>Before you import</h2><ol>{items.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, '0')}</span><p>{item}</p></li>)}</ol></section>;
}
