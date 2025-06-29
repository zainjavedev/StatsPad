import { useState, useEffect } from 'react';

export const usePlayerData = (isPlayoffs) => {
  const [regularSeasonData, setRegularSeasonData] = useState(null);
  const [playoffData, setPlayoffData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        const [regularResponse, playoffResponse] = await Promise.all([
          fetch('/data/nba-2024-25-regular-season.json'),
          fetch('/data/nba-2024-25-playoffs.json')
        ]);

        if (!regularResponse.ok || !playoffResponse.ok) {
          throw new Error('Failed to load data files');
        }

        const regularData = await regularResponse.json();
        const playoffDataRes = await playoffResponse.json();

        setRegularSeasonData(regularData);
        setPlayoffData(playoffDataRes);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Error loading player data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const currentData = isPlayoffs ? playoffData : regularSeasonData;

  return {
    currentData,
    regularSeasonData,
    playoffData,
    loading,
    error
  };
};