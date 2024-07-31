import 'package:flutter/material.dart';
import 'fixtures_page.dart';
import 'league_table_page.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Football App',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: HomePage(),
      routes: {
        '/fixtures': (context) => FixturesPage(gameWeek: 1),
        '/leagueTable': (context) => LeagueTablePage(),
      },
    );
  }
}

class HomePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Football App')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ElevatedButton(
              onPressed: () {
                Navigator.pushNamed(context, '/fixtures');
              },
              child: Text('View Fixtures'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pushNamed(context, '/leagueTable');
              },
              child: Text('View League Table'),
            ),
          ],
        ),
      ),
    );
  }
}
