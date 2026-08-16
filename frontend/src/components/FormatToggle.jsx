import { Film, Music } from 'lucide-react';

export function FormatToggle({ format, setFormat }) {
  return (
    <div className="flex gap-2">
      {[
        { id: 'mp4', label: 'Video', icon: Film },
        { id: 'mp3', label: 'Audio', icon: Music },
      ].map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setFormat(id)}
          className={`chip flex items-center gap-1 ${format === id ? 'chip-active' : 'chip-inactive'}`}
        >
          <Icon size={15} />
          <span>{label}</span>
          <span>|</span>
          <span className="text-md uppercase">.{id}</span>
        </button>
      ))}
    </div>
  );
}
