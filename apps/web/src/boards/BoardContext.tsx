import React from 'react';

export type BoardContextValue = {
  currentTopicId?: string;
  setCurrentTopicId: (id?: string) => void;
};

export const BoardContext = React.createContext<BoardContextValue>({
  setCurrentTopicId: () => {}
});

export function BoardProvider(props: React.PropsWithChildren<{}>) {
  const [currentTopicId, setCurrentTopicId] = React.useState<string | undefined>(undefined);
  const value = React.useMemo(() => ({ currentTopicId, setCurrentTopicId }), [currentTopicId]);
  return <BoardContext.Provider value={value}>{props.children}</BoardContext.Provider>;
}


