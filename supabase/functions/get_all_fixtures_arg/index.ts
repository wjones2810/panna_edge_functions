import { serve } from 'https://deno.land/std@0.114.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface Participant {
  id: number;
  name: string;
  meta: {
    location: string;
  };
}

interface Score {
  participant_id: number;
  score: {
    goals: number;
  };
  description: string;
}

interface Fixture {
  id: number;
  starting_at: string;
  ending_at: string;
  participants?: Participant[];
  scores?: Score[];
  state_id: number;
  round_id: number;
}

interface Season {
  id: number;
  fixtures: Fixture[];
}

interface ApiResponse {
  data: {
    id: number;
    fixtures: Fixture[];
  };
}

const supabaseUrl = 'https://bbsizuvgalagwonxgivl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJic2l6dXZnYWxhZ3dvbnhnaXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE0ODI2NzQsImV4cCI6MjAzNzA1ODY3NH0.oFWBLzwMabXe6JMrJgrfUuJUJUUhUVVVPsuSfiWa9H4'; // Replace with your actual Supabase API key
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (_req) => {
  const apiUrl = 'https://api.sportmonks.com/v3/football/seasons/23024?api_token=6oOxlfu7qpicPTZpo9i0ux47MDTmszlNf8bel8TtLGW5j8hnpuL6NCL7J46j&include=fixtures';

  try {
    console.log('Fetching team mappings from Supabase...');
    const { data: teams, error: teamsError } = await supabase
      .from('teams_arg')
      .select('team_id, api_team_id');

    if (teamsError) {
      console.error('Error fetching teams:', teamsError.message);
      throw new Error(`Error fetching teams: ${teamsError.message}`);
    }

    const teamMapping: { [key: number]: string } = {};
    teams.forEach((team: { team_id: string; api_team_id: number }) => {
      teamMapping[team.api_team_id] = team.team_id;
    });

    console.log('Team mappings:', teamMapping);

    console.log('Fetching data from SportMonks API...');
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer 6oOxlfu7qpicPTZpo9i0ux47MDTmszlNf8bel8TtLGW5j8hnpuL6NCL7J46j`, // Ensure the token is correct
      },
    });

    console.log(`API response status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}: ${response.statusText}`);
    }

    const data: ApiResponse = await response.json();

    console.log('API data fetched successfully:', JSON.stringify(data, null, 2));

    if (!data.data || !Array.isArray(data.data.fixtures)) {
      console.error('Unexpected API response structure:', JSON.stringify(data, null, 2));
      throw new Error('Invalid API response structure');
    }

    const fixtures = data.data.fixtures.map((fixture) => {
      const homeTeam = fixture.participants?.find((p) => p.meta.location === 'home');
      const awayTeam = fixture.participants?.find((p) => p.meta.location === 'away');
      const homeScore = fixture.scores?.find((s) => s.participant_id === homeTeam?.id)?.score.goals ?? null;
      const awayScore = fixture.scores?.find((s) => s.participant_id === awayTeam?.id)?.score.goals ?? null;

      console.log(`Fixture: ${fixture.id}`);
      console.log(`Home team: ${homeTeam ? homeTeam.name : 'Unknown'} (${homeTeam ? homeTeam.id : 'No ID'})`);
      console.log(`Away team: ${awayTeam ? awayTeam.name : 'Unknown'} (${awayTeam ? awayTeam.id : 'No ID'})`);
      console.log(`Mapped home team ID: ${homeTeam ? teamMapping[homeTeam.id] : 'No mapping'}`);
      console.log(`Mapped away team ID: ${awayTeam ? teamMapping[awayTeam.id] : 'No mapping'}`);

      return {
        fixture_id: crypto.randomUUID(),
        api_fixture_id: fixture.id,
        home_team_id: homeTeam ? teamMapping[homeTeam.id] : null,
        away_team_id: awayTeam ? teamMapping[awayTeam.id] : null,
        home_team_score: homeScore,
        away_team_score: awayScore,
        finished_status: homeScore !== null,
        game_week: fixture.round_id,
        start_time: fixture.starting_at,
        end_time: fixture.ending_at,
        last_updated_at: new Date().toISOString(), // add the last_updated_at field
        home_team_win: homeScore !== null && awayScore !== null ? homeScore > awayScore : null, // calculate home_team_win
        away_team_win: homeScore !== null && awayScore !== null ? homeScore < awayScore : null // calculate away_team_win
      };
    });

    console.log('Transformed fixtures data:', JSON.stringify(fixtures, null, 2));

    console.log('Inserting data into Supabase...');
    const { data: insertData, error: insertError } = await supabase
      .from('fixtures_arg') // Change made here to insert into fixtures_arg
      .insert(fixtures);

    if (insertError) {
      console.error('Error inserting data:', insertError.message);
      throw new Error(`Error inserting data: ${insertError.message}`);
    }

    console.log('Data inserted successfully:', JSON.stringify(insertData, null, 2));

    return new Response(JSON.stringify({ fixtures: insertData }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error occurred:', error);

    return new Response(`Error: ${error.message}`, {
      headers: { 'Content-Type': 'text/plain' },
      status: 500
    });
  }
});
