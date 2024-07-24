import { serve } from 'https://deno.land/std@0.114.0/http/server.ts';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';


// Create a single supabase client for interacting with your database
const supabase = createClient('https://xyzcompany.supabase.co', 'public-anon-key')

// Interfaces define the structure of the objects used in the program. 
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
  participants: Participant[];
  scores: Score[];
  state_id: number;
}

interface Round {
  id: number;
  fixtures: Fixture[];
}

interface Season {
  rounds: Round[];
}

interface ApiResponse {
  data: Season[];
}

// Initialize Supabase client
const supabaseUrl = 'https://bbsizuvgalagwonxgivl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJic2l6dXZnYWxhZ3dvbnhnaXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE0ODI2NzQsImV4cCI6MjAzNzA1ODY3NH0.oFWBLzwMabXe6JMrJgrfUuJUJUUhUVVVPsuSfiWa9H4';




serve(async (req: Request) => { // Sets up an HTTP server to handle incoming requests

  const apiUrl = 'https://api.sportmonks.com/v3/football/schedules/seasons/23584?api_token=6oOxlfu7qpicPTZpo9i0ux47MDTmszlNf8bel8TtLGW5j8hnpuL6NCL7J46j'; // Fetches data from the API

  try {
    const response = await fetch(apiUrl);
    const data: ApiResponse = await response.json();

    const teamMapping: { [key: string]: string } = { // Map created 
      "FC Copenhagen": "05726ad6-7681-43df-92c3-d1db0b14eece",
      "Silkeborg": "c8f414b1-5fde-4a46-93a9-5e990b03cd7e",
      "Brøndby": "29182e56-5b10-45f7-b225-d7b25a9ff863",
      "SønderjyskE": "ccfa27b5-588e-434a-9c0f-71f1e86767d9",
      "Midtjylland": "c797d4e6-e999-4ecf-a5cb-db426f2bdc84",
      "AaB": "47737202-640b-4e49-935b-e3896bde73b0",
      "Randers": "709f707c-3e41-494d-809f-90cc3ea60339",
      "Nordsjælland": "5b105005-cc52-4c85-aa03-f863d69d7353",
      "Viborg": "259013c4-cd4c-4d3d-ab07-b4fa473f0d12",
      "Lyngby": "1653172b-9873-4b67-a9bd-4ff5ef635f9b",
      "AGF": "08416e41-c693-4b55-a956-9c120110edf4",
      "Vejle": "d4e98dde-6515-4387-a0b0-31695ee18c68"
    };

    // Extract and map fixture data
    // Maps the fetched data to create fixture objects with the necessary information. 
    // Map applies a funciton to each element in an array. 
    // flat: Flattens a nested array (array within array) into a single array of specified depth. 
    // flatMap used to process nested structures in the API response, specificically here to flatten rounds and fixtures TO a single array of fixtures. 
    const fixtures = data.data.flatMap((season) => 
      season.rounds.flatMap((round) =>
        round.fixtures.map((fixture) => {
          const homeTeam = fixture.participants.find((p) => p.meta.location === 'home');
          const awayTeam = fixture.participants.find((p) => p.meta.location === 'away');
          const homeScore = fixture.scores.find((s) => s.participant_id === homeTeam?.id)?.score.goals ?? null;
          const awayScore = fixture.scores.find((s) => s.participant_id === awayTeam?.id)?.score.goals ?? null;

          return {
            fixture_id: crypto.randomUUID(),
            api_fixture_id: fixture.id,
            home_team_id: homeTeam ? teamMapping[homeTeam.name] : null,
            away_team_id: awayTeam ? teamMapping[awayTeam.name] : null,
            home_team_score: homeScore,
            away_team_score: awayScore,
            finished_status: false, // All games are finished
            game_week: round.id, // Assuming round.id represents the game week
            start_time: fixture.starting_at,
            end_time: fixture.ending_at
          };
        })
      )
    );

    // Insert fixtures into the database 
    const { data: insertData, error: insertError } = await supabase
      .from('fixtures')
      .insert(fixtures);

    if (insertError) {
      console.error('Error inserting data:', insertError);
      return new Response('Error inserting data', {
        headers: { 'Content-Type': 'text/plain' },
        status: 500
      });
    }

    // Return a response with the inserted data or an error message if something goes wrong 
    return new Response(JSON.stringify({ fixtures: insertData }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching API:', error);

    return new Response('Error fetching API', {
      headers: { 'Content-Type': 'text/plain' },
      status: 500
    });
  }
});