import 'package:flutter/material.dart';
import 'fetch_data.dart';

class LeagueTablePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('League Table')),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: fetchStandings(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          } else {
            final standings = snapshot.data!;
            standings.sort((a, b) => b['points'] - a['points']);

            return ListView.builder(
              itemCount: standings.length,
              itemBuilder: (context, index) {
                final team = standings[index];
                final pos = index + 1;

                return ListTile(
                  leading: Text('$pos'),
                  title: Text(team['team_name']),
                  subtitle: Text(
                    'Points: ${team['points']} - GD: ${team['goal_difference']} - Played: ${team['played']}',
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
