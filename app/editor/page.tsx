import Nav from '@/components/Nav';
import Editor from '@/components/Editor';

export default function EditorPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Nav />
      <main className="flex-1 overflow-hidden">
        <Editor />
      </main>
    </div>
  );
}
