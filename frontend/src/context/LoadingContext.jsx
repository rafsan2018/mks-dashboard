import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { subscribeLoading } from '../api/axiosInstance';

const LoadingContext = createContext({
  isLoading: false,
  activeRequests: 0,
});

export const LoadingProvider = ({ children }) => {
  const [loadingState, setLoadingState] = useState({
    isLoading: false,
    activeRequests: 0,
  });

  useEffect(() => {
    const unsubscribe = subscribeLoading((isLoading, activeRequests) => {
      setLoadingState({ isLoading, activeRequests });
    });
    return unsubscribe;
  }, []);

  const value = useMemo(() => loadingState, [loadingState]);

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export default LoadingContext;
