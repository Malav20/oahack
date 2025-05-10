'use client';
import ChatPage from './components/ChatApp';

export default function Home() {
  return (
    <div className="no-scrollbar flex flex-col h-screen bg-[#212121]">
      <ChatPage/>
    </div>
  );
}
