import { serve } from 'https://deno.land/std@0.114.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = 'https://bbsizuvgalagwonxgivl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJic2l6dXZnYWxhZ3dvbnhnaXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE0ODI2NzQsImV4cCI6MjAzNzA1ODY3NH0.oFWBLzwMabXe6JMrJgrfUuJUJUUhUVVVPsuSfiWa9H4'; // Replace with your actual Supabase API key
const supabase = createClient(supabaseUrl, supabaseKey);

interface Fixture {
  fixture_id: string;
  home_team_id: string;
  away_team_id: string;
  home_team_score: number;
  away_team_score: number;
  finished_status: boolean;
  game_week: number;
  start_time: string;
  end_time: string;
  api_fixture_id: number;
}

interface Standing {
  team_id: string;
  team_name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
}

serve(async (req) => {
  try {
    // Fetch all finished fixtures
    const { data: fixtures, error: fetchError } = await supabase
      .from('fixtures')
      .select('*')
      .eq('finished_status', true);

    if (fetchError) {
      throw new Error(`Error fetching fixtures: ${fetchError.message}`);
    }

    if (!fixtures || fixtures.length === 0) {
      return new Response('No finished fixtures found', {
        headers: { 'Content-Type': 'text/plain' },
        status: 404,
      });
    }

    // Fetch team names
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('team_id, team_name');

    if (teamsError) {
      throw new Error(`Error fetching teams: ${teamsError.message}`);
    }

    const teamNameMap = teams.reduce((map: { [key: string]: string }, team: { team_id: string; team_name: string }) => {
      map[team.team_id] = team.team_name;
      return map;
    }, {});

    // Initialize standings map
    const standingsMap: { [key: string]: Standing } = {};

    for (const fixture of fixtures) {
      const homeTeamId = fixture.home_team_id;
      const awayTeamId = fixture.away_team_id;
      const homeScore = fixture.home_team_score;
      const awayScore = fixture.away_team_score;

      if (!standingsMap[homeTeamId]) {
        standingsMap[homeTeamId] = {
          team_id: homeTeamId,
          team_name: teamNameMap[homeTeamId],
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goals_for: 0,
          goals_against: 0,
          goal_difference: 0,
          points: 0,
        };
      }

      if (!standingsMap[awayTeamId]) {
        standingsMap[awayTeamId] = {
          team_id: awayTeamId,
          team_name: teamNameMap[awayTeamId],
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goals_for: 0,
          goals_against: 0,
          goal_difference: 0,
          points: 0,
        };
      }

      // Update standings for home team
      standingsMap[homeTeamId].played += 1;
      standingsMap[homeTeamId].goals_for += homeScore;
      standingsMap[homeTeamId].goals_against += awayScore;
      standingsMap[homeTeamId].goal_difference += homeScore - awayScore;

      // Update standings for away team
      standingsMap[awayTeamId].played += 1;
      standingsMap[awayTeamId].goals_for += awayScore;
      standingsMap[awayTeamId].goals_against += homeScore;
      standingsMap[awayTeamId].goal_difference += awayScore - homeScore;

      if (homeScore > awayScore) {
        standingsMap[homeTeamId].won += 1;
        standingsMap[homeTeamId].points += 3;
        standingsMap[awayTeamId].lost += 1;
      } else if (homeScore < awayScore) {
        standingsMap[awayTeamId].won += 1;
        standingsMap[awayTeamId].points += 3;
        standingsMap[homeTeamId].lost += 1;
      } else {
        standingsMap[homeTeamId].drawn += 1;
        standingsMap[homeTeamId].points += 1;
        standingsMap[awayTeamId].drawn += 1;
        standingsMap[awayTeamId].points += 1;
      }
    }

    // Prepare standings array for insertion
    const standingsArray = Object.values(standingsMap);

    // Insert/Update standings in Supabase
    const { data: insertData, error: insertError } = await supabase
      .from('standings')
      .upsert(standingsArray, { onConflict: ['team_id'] });

    if (insertError) {
      throw new Error(`Error inserting standings: ${insertError.message}`);
    }

    return new Response(JSON.stringify({ standings: insertData }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error occurred:', error);

    return new Response(`Error: ${error.message}`, {
      headers: { 'Content-Type': 'text/plain' },
      status: 500,
    });
  }
});
