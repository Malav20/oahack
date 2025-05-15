'use client';
import ChatPage from './components/ChatApp';

export default function Home() {
  return (
    <div className="no-scrollbar flex flex-col h-screen bg-[#f0e4e4]">
      <ChatPage/>
    </div>
  );
}
