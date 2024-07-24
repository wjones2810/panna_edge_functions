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

const supabaseUrl = 'https://bbsizuvgalagwonxgivl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJic2l6dXZnYWxhZ3dvbnhnaXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE0ODI2NzQsImV4cCI6MjAzNzA1ODY3NH0.oFWBLzwMabXe6JMrJgrfUuJUJUUhUVVVPsuSfiWa9H4'; // Replace with your actual Supabase API key
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req: Request) => {
  const apiUrl = 'https://api.sportmonks.com/v3/football/schedules/seasons/23584?api_token=6oOxlfu7qpicPTZpo9i0ux47MDTmszlNf8bel8TtLGW5j8hnpuL6NCL7J46j';

  try {
    console.log('Fetching data from SportMonks API...');
    const response = await fetch(apiUrl);
    const data: ApiResponse = await response.json();

    console.log('API data fetched successfully');

    const teamMapping: { [key: string]: string } = {
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

    const fixtures = data.data.flatMap((season) =>
      season.rounds.flatMap((round) =>
        round.fixtures.map((fixture) => {
          const homeTeam = fixture.participants.find((p) => p.meta.location === 'home');
          const awayTeam = fixture.participants.find((p) => p.meta.location === 'away');
          const homeScore = fixture.scores.find((s) => s.participant_id === homeTeam?.id)?.score.goals ?? null;
          const awayScore = fixture.scores.find((s) => s.participant_id === awayTeam?.id)?.score.goals ?? null;

          return {
            api_fixture_id: fixture.id,
            home_team_id: homeTeam ? teamMapping[homeTeam.name] : null,
            away_team_id: awayTeam ? teamMapping[awayTeam.name] : null,
            home_team_score: homeScore,
            away_team_score: awayScore,
            finished_status: homeScore !== null,
            game_week: round.id,
            start_time: fixture.starting_at,
            end_time: fixture.ending_at,
            last_updated_at: new Date().toISOString()
          };
        })
      )
    );

    console.log('Transformed fixtures data:', JSON.stringify(fixtures, null, 2));

    for (const fixture of fixtures) {
      const { data: existingFixture, error: fetchError } = await supabase
        .from('fixtures')
        .select('api_fixture_id, home_team_id, away_team_id, home_team_score, away_team_score, finished_status, game_week, start_time, end_time')
        .eq('api_fixture_id', fixture.api_fixture_id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching existing fixture:', fetchError);
        return new Response('Error fetching existing fixture', {
          headers: { 'Content-Type': 'text/plain' },
          status: 500
        });
      }

      if (existingFixture) {
        const hasChanges = 
          existingFixture.home_team_id !== fixture.home_team_id ||
          existingFixture.away_team_id !== fixture.away_team_id ||
          existingFixture.home_team_score !== fixture.home_team_score ||
          existingFixture.away_team_score !== fixture.away_team_score ||
          existingFixture.finished_status !== fixture.finished_status ||
          existingFixture.game_week !== fixture.game_week ||
          existingFixture.start_time !== fixture.start_time ||
          existingFixture.end_time !== fixture.end_time;

        if (hasChanges) {
          const { error: updateError } = await supabase
            .from('fixtures')
            .update({
              home_team_id: fixture.home_team_id,
              away_team_id: fixture.away_team_id,
              home_team_score: fixture.home_team_score,
              away_team_score: fixture.away_team_score,
              finished_status: fixture.finished_status,
              game_week: fixture.game_week,
              start_time: fixture.start_time,
              end_time: fixture.end_time,
              last_updated_at: new Date().toISOString()
            })
            .eq('api_fixture_id', fixture.api_fixture_id);

          if (updateError) {
            console.error('Error updating fixture:', updateError);
            return new Response('Error updating fixture', {
              headers: { 'Content-Type': 'text/plain' },
              status: 500
            });
          }
        }
      } else {
        const { error: insertError } = await supabase
          .from('fixtures')
          .insert({
            fixture_id: crypto.randomUUID(),
            ...fixture
          });

        if (insertError) {
          console.error('Error inserting new fixture:', insertError);
          return new Response('Error inserting new fixture', {
            headers: { 'Content-Type': 'text/plain' },
            status: 500
          });
        }
      }
    }

    return new Response('Fixtures updated successfully', {
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (error) {
    console.error('Error fetching API:', error);

    return new Response('Error fetching API', {
      headers: { 'Content-Type': 'text/plain' },
      status: 500
    });
  }
});
