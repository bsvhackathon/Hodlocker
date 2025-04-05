import { useState, useEffect } from 'react'

export function useNetworkStats() {
  const [data, setData] = useState({
    difficulty: null,
    hashrate: null,
    isLoading: true
  });

  useEffect(() => {
    const fetchNetworkStats = async () => {
      try {
        const response = await fetch('/api/network-stats');
        
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        setData({
          difficulty: data.chainInfo.difficulty,
          hashrate: data.chainInfo.hashrate,
          isLoading: false
        });
      } catch (error) {
        console.error('Error fetching network stats:', error);
        setData({
          difficulty: null,
          hashrate: null,
          isLoading: false
        });
      }
    };

    fetchNetworkStats();
  }, []);

  return data;
}