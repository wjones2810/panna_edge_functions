import 'package:supabase_flutter/supabase_flutter.dart';

final supabase = SupabaseClient('https://bbsizuvgalagwonxgivl.supabase.co', 'your_supabase_api_key_here');

Future<List<Map<String, dynamic>>> fetchFixtures(int gameWeek) async {
  try {
    final response = await supabase
        .from('fixtures')
        .select('*, home_team:home_team_id(team_name), away_team:away_team_id(team_name)')
        .eq('game_week', gameWeek)
        .execute();

    if (response.error != null) {
      throw Exception('Failed to load fixtures: ${response.error.message}');
    }

    return List<Map<String, dynamic>>.from(response.data as List);
  } catch (e) {
    throw Exception('Error fetching fixtures: ${e.toString()}');
  }
}

Future<List<Map<String, dynamic>>> fetchStandings() async {
  try {
    final response = await supabase
        .from('standings')
        .select('*')
        .order('points', ascending: false)
        .execute();

    if (response.error != null) {
      throw Exception('Failed to load standings: ${response.error.message}');
    }

    return List<Map<String, dynamic>>.from(response.data as List);
  } catch (e) {
    throw Exception('Error fetching standings: ${e.toString()}');
  }
}

Future<List<Map<String, dynamic>>> getTeamIdsByName(String teamName) async {
  try {
    final response = await supabase
        .from('teams')
        .select('id')
        .eq('name', teamName)
        .execute();

    if (response.error != null) {
      throw Exception('Failed to load team IDs: ${response.error.message}');
    }

    return List<Map<String, dynamic>>.from(response.data as List);
  } catch (e) {
    throw Exception('Error fetching team IDs: ${e.toString()}');
  }
}
