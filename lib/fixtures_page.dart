import 'package:flutter/material.dart';
import 'fetch_data.dart';

class FixturesPage extends StatelessWidget {
  final int gameWeek;

  FixturesPage({required this.gameWeek});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Fixtures - GW-$gameWeek')),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: fetchFixtures(gameWeek),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          } else {
            final fixtures = snapshot.data!;
            return ListView.builder(
              itemCount: fixtures.length,
              itemBuilder: (context, index) {
                final fixture = fixtures[index];
                final homeTeam = fixture['home_team']['team_name'];
                final awayTeam = fixture['away_team']['team_name'];
                final startTime = DateTime.parse(fixture['start_time']);
                final isFinished = fixture['finished_status'];
                final homeScore = fixture['home_team_score'];
                final awayScore = fixture['away_team_score'];

                return ListTile(
                  title: Text('$homeTeam vs $awayTeam'),
                  subtitle: Text(
                    '${startTime.toLocal()} - ${isFinished ? "$homeScore - $awayScore" : "Kick-off"}',
                  ),
                );
              },
            );
          }
        },
      ),
    );
  }
}
