import { serve } from "https://deno.land/std@0.140.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

// Supabase initialization
const supabaseUrl = 'https://bbsizuvgalagwonxgivl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpc3R4em9tZHNrY2piamlvaXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjIwMDc2MjgsImV4cCI6MjAzNzU4MzYyOH0.BIUebpgRzkm455IbXgUn9Qd7FMWbWs4dBVEysU5oFKQ';
const supabase = createClient(supabaseUrl, supabaseKey);

// Sportmonks API
const sportmonksApiUrl = 'https://api.sportmonks.com/v3/football/livescores/latest?api_token=6oOxlfu7qpicPTZpo9i0ux47MDTmszlNf8bel8TtLGW5j8hnpuL6NCL7J46j&include=periods.type;scores;league';

// Define the types for the fixture data
interface Period {
  name: string;
  ticking: boolean;
  minutes: number;
  seconds: number;
}

interface Score {
  participant: 'home' | 'away';
  description: string;
  score: {
    goals: number;
  };
}

interface Fixture {
  id: number;
  season_id: number;
  state_id: number;
  periods: Period[];
  scores: Score[];
}

// Function to update live scores
const updateLiveScores = async () => {
  try {
    const response = await fetch(sportmonksApiUrl);
    const data = await response.json();

    // Filter fixtures for the specific season and specific fixture ID
    const apiFixtureId = 19059928;
    const fixtures: Fixture[] = data.data.filter((fixture: Fixture) => fixture.id === apiFixtureId);

    for (const fixture of fixtures) {
      const firstHalf = fixture.periods.some(period => period.name === '1st Half' && period.ticking);
      const secondHalf = fixture.periods.some(period => period.name === '2nd Half' && period.ticking);
      const halfTime = fixture.state_id === 3;
      const fullTime = fixture.state_id === 5;
      const tickingPeriod = fixture.periods.find(period => period.ticking);
      const minutes = tickingPeriod ? tickingPeriod.minutes : null;
      const seconds = tickingPeriod ? tickingPeriod.seconds : null;

      const liveScore = {
        home_team_score: fixture.scores.find(score => score.participant === 'home' && score.description === 'CURRENT')?.score.goals || 0,
        away_team_score: fixture.scores.find(score => score.participant === 'away' && score.description === 'CURRENT')?.score.goals || 0,
        first_half: firstHalf,
        minutes: minutes,
        seconds: seconds,
        half_time: halfTime,
        second_half: secondHalf,
        full_time: fullTime
      };

      // Update Supabase table
      const { error } = await supabase
        .from('live_scores')
        .update(liveScore)
        .eq('fixture_id', fixture.id);

      if (error) {
        console.error('Error updating live score:', error);
      }
    }
  } catch (error) {
    console.error('Error fetching live scores:', error);
  }
};

// Function to serve the function
const startServer = () => {
  serve((_req) => {
    return new Response("Live scores updating service is running", { status: 200 });
  });
};

// Schedule the updateLiveScores function to run every 3 seconds
setInterval(updateLiveScores, 3000);

// Start the server
startServer();
