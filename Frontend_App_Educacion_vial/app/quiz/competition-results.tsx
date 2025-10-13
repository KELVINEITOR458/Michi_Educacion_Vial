import React from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import FinalRankings from './FinalRankings';

export default function CompetitionResults() {
  const router = useRouter();
  // En una integración real, obtendrías rankings desde params o estado global/socket
  const fakeRankings: any[] = [];

  return (
    <View style={{ flex: 1 }}>
      <FinalRankings
        rankings={fakeRankings as any}
        currentPlayerId={''}
        onPlayAgain={() => router.replace('/quiz/competition')}
      />
    </View>
  );
}


