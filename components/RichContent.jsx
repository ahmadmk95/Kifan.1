export default function RichContent({ html }) {
  return <div className="rich" dangerouslySetInnerHTML={{ __html: html || '' }} />;
}
