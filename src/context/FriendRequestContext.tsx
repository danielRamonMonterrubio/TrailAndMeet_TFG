import React, { createContext, useState } from 'react';

interface FriendRequestContextType {
  pendingCount: number;
  setPendingCount: (n: number) => void;
}

export const FriendRequestContext = createContext<FriendRequestContextType>({
  pendingCount: 0,
  setPendingCount: () => {},
});

export const FriendRequestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pendingCount, setPendingCount] = useState(0);
  return (
    <FriendRequestContext.Provider value={{ pendingCount, setPendingCount }}>
      {children}
    </FriendRequestContext.Provider>
  );
};
