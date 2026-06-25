import React, { createContext, useState, useContext } from 'react';

interface ChatUnreadContextType {
  totalUnread: number;
  setTotalUnread: (count: number) => void;
}

export const ChatUnreadContext = createContext<ChatUnreadContextType>({
  totalUnread: 0,
  setTotalUnread: () => {},
});

export const ChatUnreadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [totalUnread, setTotalUnread] = useState(0);

  return (
    <ChatUnreadContext.Provider value={{ totalUnread, setTotalUnread }}>
      {children}
    </ChatUnreadContext.Provider>
  );
};

export const useChatUnread = () => useContext(ChatUnreadContext);
