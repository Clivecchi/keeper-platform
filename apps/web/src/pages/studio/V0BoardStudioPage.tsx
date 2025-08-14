import React from 'react';
import { useParams } from 'react-router-dom';
import BoardStudio from '../../features/board-studio/v0/BoardStudio';

const V0BoardStudioPage: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  
  return <BoardStudio boardId={boardId} />;
};

export default V0BoardStudioPage;
